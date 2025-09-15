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
    // Require explicit separate top/side paths only
    topPath = null,
    sidePath = null,
    layoutRadius = 0.5,
    gapFraction = 0.0,
    orientation = 'flat',
  } = options;

  if (!topPath || !sidePath) throw new Error('loadHexModel: topPath and sidePath are required');

  // Compose cache key for top+side pair
  const cacheKey = `${topPath}|${sidePath}`;
  if (modelMeasureCache.has(cacheKey)) return Object.assign({}, modelMeasureCache.get(cacheKey));

  // Load top and side GLTFs
  const [gltfTop, gltfSide] = await Promise.all([loadGLTF(topPath), loadGLTF(sidePath)]);
  const topScene = gltfTop.scene || (gltfTop.scenes && gltfTop.scenes[0]) || null;
  const sideScene = gltfSide.scene || (gltfSide.scenes && gltfSide.scenes[0]) || null;
  if (!topScene || !sideScene) throw new Error(`loadHexModel: missing scene in either topPath=${topPath} or sidePath=${sidePath}`);
  // Compose a group for measurement/center
  const scene = new THREE.Group();
  scene.add(topScene); scene.add(sideScene);

  // If author expects 'flat' layout, rotate the model by 30deg so flats face X (legacy behavior)
  if (orientation === 'flat') {
    scene.rotation.y = Math.PI / 6; // 30 degrees
  }
  scene.updateWorldMatrix(true, true);

  // Extract mesh geometries and bake world transforms. If separate top/side
  // scenes were provided, prefer the first mesh found in each scene.
  let topGeom = null;
  let sideGeom = null;
  // find first mesh in topScene and first mesh in sideScene
  topScene.traverse((child) => {
    if (!topGeom && child.isMesh && child.geometry) {
      try { topGeom = child.geometry.clone(); topGeom.applyMatrix4(child.matrixWorld); } catch (e) { /* ignore */ }
    }
  });
  sideScene.traverse((child) => {
    if (!sideGeom && child.isMesh && child.geometry) {
      try { sideGeom = child.geometry.clone(); sideGeom.applyMatrix4(child.matrixWorld); } catch (e) { /* ignore */ }
    }
  });
  if (!topGeom || !sideGeom) {
    throw new Error(`loadHexModel: expected both topPath and sidePath to contain a mesh; found top=${!!topGeom} side=${!!sideGeom}`);
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

  modelMeasureCache.set(cacheKey, result);
  return Object.assign({}, result);
}

export default { loadHexModel };
