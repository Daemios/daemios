import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

// Orientation-aware, measurement-focused loader for 3d2 scenes.
// Mirrors the essential behavior from the legacy loader but keeps it local to 3d2.

const modelMeasureCache = new Map();

function loadGLTF(path) {
  const loader = new GLTFLoader();
  return new Promise((resolve, reject) => {
    loader.load(path, (gltf) => resolve(gltf), undefined, reject);
  });
}

function recenterGeometry(geom) {
  if (!geom) return geom;
  geom.computeBoundingBox();
  if (!geom.boundingBox) return geom;
  const box = geom.boundingBox;
  const center = new THREE.Vector3();
  box.getCenter(center);
  const minY = box.min.y;
  const m = new THREE.Matrix4().makeTranslation(-center.x, -minY, -center.z);
  geom.applyMatrix4(m);
  geom.computeBoundingSphere();
  geom.computeBoundingBox();
  return geom;
}

function computeContactScaleFromGeom(topGeom, layoutRadius, modelScaleFactor, gapFraction) {
  if (!topGeom || !topGeom.attributes || !topGeom.attributes.position) return 1.0;
  const pos = topGeom.attributes.position;
  const R = layoutRadius;
  const deltas = [
    new THREE.Vector2(1.5 * R, Math.sqrt(3) * 0.5 * R),
    new THREE.Vector2(1.5 * R, -Math.sqrt(3) * 0.5 * R),
    new THREE.Vector2(0, Math.sqrt(3) * R),
    new THREE.Vector2(-1.5 * R, -Math.sqrt(3) * 0.5 * R),
    new THREE.Vector2(-1.5 * R, Math.sqrt(3) * 0.5 * R),
    new THREE.Vector2(0, -Math.sqrt(3) * R),
  ];
  const sx = modelScaleFactor || 1.0;
  let needed = Infinity;
  for (let k = 0; k < deltas.length; k += 1) {
    const delta = deltas[k];
    const centerDist = delta.length();
    if (centerDist === 0) continue;
    const d = delta.clone().normalize();
    let minDot = Infinity;
    let maxDot = -Infinity;
    for (let i = 0; i < pos.count; i += 1) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const dot = x * d.x + z * d.y;
      if (dot < minDot) minDot = dot;
      if (dot > maxDot) maxDot = dot;
    }
    const footprint = maxDot - minDot;
    if (footprint > 0) {
      const desiredGap = Math.max(0, (gapFraction || 0) * layoutRadius);
      const centerMinusGap = Math.max(0.001, centerDist - desiredGap);
      const required = centerMinusGap / (sx * footprint);
      if (required < needed) needed = required;
    }
  }
  if (!isFinite(needed)) return 1.0;
  return Math.max(0.5, Math.min(1.5, needed));
}

export async function loadHexModel(options = {}) {
  const {
    path = '/models/hex-can.glb',
    layoutRadius = 0.5,
    gapFraction = 0.0,
    orientation = 'flat',
  } = options;

  if (modelMeasureCache.has(path)) {
    return Object.assign({}, modelMeasureCache.get(path));
  }

  const gltf = await loadGLTF(path);
  const scene = gltf.scene || gltf.scenes && gltf.scenes[0] || null;
  if (!scene) {
    return { topGeom: null, sideGeom: null, modelCenter: new THREE.Vector3(), hexMaxY: 1, modelScaleFactor: 1, contactScale: 1, scene: null };
  }

  // If author expects 'flat' layout, rotate the model by 30deg so flats face X (legacy behavior)
  if (orientation === 'flat') {
    scene.rotation.y = Math.PI / 6; // 30 degrees
  }
  scene.updateWorldMatrix(true, true);

  // Extract mesh geometries and bake world transforms
  let topGeom = null;
  let sideGeom = null;
  let meshCount = 0;
  scene.traverse((child) => {
    if (child.isMesh && child.geometry) {
      try {
        meshCount += 1;
        const g = child.geometry.clone();
        g.applyMatrix4(child.matrixWorld);
        if (!topGeom) topGeom = g;
        else if (!sideGeom) sideGeom = g;
      } catch (e) {
        // ignore geometry extraction errors
      }
    }
  });

  // If the model only provided a single mesh, treat it as the side geometry only
  // and leave topGeom null so renderers will use a flat fallback top. This
  // prevents instancing the exact same mesh twice (top + side) which causes
  // coplanar overlap and z-fighting.
  if (meshCount === 1 && topGeom && !sideGeom) {
    sideGeom = topGeom;
    topGeom = null;
  } else {
    if (!topGeom && sideGeom) topGeom = sideGeom.clone();
    if (!sideGeom && topGeom) sideGeom = topGeom.clone();
  }

  // Recenter and compute geometry metrics
  if (topGeom) recenterGeometry(topGeom);
  if (sideGeom) recenterGeometry(sideGeom);

  let hexMaxY = 1;
  let nativeRadius = 1;
  let nativeEdgeWidth = 1;
  let modelScaleFactor = 1;
  let contactScale = 1;

  if (topGeom && topGeom.attributes && topGeom.attributes.position) {
    topGeom.computeBoundingBox();
    sideGeom && sideGeom.computeBoundingBox();
    const topMaxY = topGeom.boundingBox ? topGeom.boundingBox.max.y : 1;
    const sideMaxY = sideGeom && sideGeom.boundingBox ? sideGeom.boundingBox.max.y : topMaxY;
    hexMaxY = Math.max(topMaxY, sideMaxY);

    // Compute max radius from vertex positions (robust to rotation)
    const pos = topGeom.attributes.position;
    let maxR = 0;
    let minX = Infinity, maxX = -Infinity;
    for (let i = 0; i < pos.count; i += 1) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const r = Math.hypot(x, z);
      if (r > maxR) maxR = r;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
    }
    nativeRadius = maxR || 1;
    nativeEdgeWidth = Math.max(0.0001, maxX - minX) || 1;
    if (nativeRadius > 0) modelScaleFactor = layoutRadius / nativeRadius;
    contactScale = computeContactScaleFromGeom(topGeom, layoutRadius, modelScaleFactor, gapFraction);
  }

  const result = {
    topGeom,
    sideGeom,
    modelCenter: new THREE.Box3().setFromObject(scene).getCenter(new THREE.Vector3()),
    hexMaxY,
    modelScaleFactor,
    contactScale,
    scene,
    nativeRadius,
    nativeEdgeWidth,
  };

  modelMeasureCache.set(path, result);
  return Object.assign({}, result);
}

export default { loadHexModel };
