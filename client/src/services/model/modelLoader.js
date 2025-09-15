import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

// Helper to wrap GLTFLoader in a promise
function loadGLTF(path) {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.load(
      path,
      (gltf) => resolve(gltf),
      undefined,
      (err) => reject(err)
    );
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
  return geom;
}

function stripUpFacingCaps(geom, dotThresh = 0.8) {
  if (!geom) return geom;
  const posAttr = geom.getAttribute("position");
  if (!posAttr) return geom;
  const up = new THREE.Vector3(0, 1, 0);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const e1 = new THREE.Vector3();
  const e2 = new THREE.Vector3();
  const n = new THREE.Vector3();
  if (geom.index) {
    const idx = geom.index.array;
    const newIdx = [];
    for (let i = 0; i < idx.length; i += 3) {
      const i0 = idx[i],
        i1 = idx[i + 1],
        i2 = idx[i + 2];
      a.fromBufferAttribute(posAttr, i0);
      b.fromBufferAttribute(posAttr, i1);
      c.fromBufferAttribute(posAttr, i2);
      e1.subVectors(b, a);
      e2.subVectors(c, a);
      n.crossVectors(e1, e2).normalize();
      const d = n.dot(up);
      if (d <= dotThresh) {
        newIdx.push(i0, i1, i2);
      }
    }
    const newGeom = geom.clone();
    newGeom.setIndex(newIdx);
    newGeom.computeVertexNormals();
    newGeom.computeBoundingBox();
    newGeom.computeBoundingSphere();
    return newGeom;
  }
  // Non-indexed fallback
  const count = posAttr.count;
  const pos = posAttr.array;
  const hasUV = !!geom.getAttribute("uv");
  const hasColor = !!geom.getAttribute("color");
  const outPos = [];
  const outUV = hasUV ? [] : null;
  const outColor = hasColor ? [] : null;
  for (let i = 0; i < count; i += 3) {
    a.fromArray(pos, (i + 0) * 3);
    b.fromArray(pos, (i + 1) * 3);
    c.fromArray(pos, (i + 2) * 3);
    e1.subVectors(b, a);
    e2.subVectors(c, a);
    n.crossVectors(e1, e2).normalize();
    const d = n.dot(up);
    if (d <= dotThresh) {
      outPos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
      if (outUV) {
        const uv = geom.getAttribute("uv");
        outUV.push(
          uv.getX(i + 0),
          uv.getY(i + 0),
          uv.getX(i + 1),
          uv.getY(i + 1),
          uv.getX(i + 2),
          uv.getY(i + 2)
        );
      }
      if (outColor) {
        const col = geom.getAttribute("color");
        outColor.push(
          col.getX(i + 0),
          col.getY(i + 0),
          col.getZ(i + 0),
          col.getX(i + 1),
          col.getY(i + 1),
          col.getZ(i + 1),
          col.getX(i + 2),
          col.getY(i + 2),
          col.getZ(i + 2)
        );
      }
    }
  }
  const newGeom = new THREE.BufferGeometry();
  newGeom.setAttribute("position", new THREE.Float32BufferAttribute(outPos, 3));
  if (outUV)
    newGeom.setAttribute("uv", new THREE.Float32BufferAttribute(outUV, 2));
  if (outColor)
    newGeom.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(outColor, 3)
    );
  newGeom.computeVertexNormals();
  newGeom.computeBoundingBox();
  newGeom.computeBoundingSphere();
  return newGeom;
}

function stripInwardFacingWalls(geom) {
  if (!geom) return geom;
  const posAttr = geom.getAttribute("position");
  if (!posAttr) return geom;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const e1 = new THREE.Vector3();
  const e2 = new THREE.Vector3();
  const n = new THREE.Vector3();
  const centroid = new THREE.Vector3();
  const isVertical = (normal) => Math.abs(normal.y) < 0.2;
  const radius = (v) => Math.hypot(v.x, v.z);

  // First pass: find radius range for vertical walls
  let rMin = Infinity,
    rMax = -Infinity;
  const scanTri = (va, vb, vc) => {
    e1.subVectors(vb, va);
    e2.subVectors(vc, va);
    n.crossVectors(e1, e2).normalize();
    if (!isVertical(n)) return;
    centroid
      .copy(va)
      .add(vb)
      .add(vc)
      .multiplyScalar(1 / 3);
    const rc = radius(centroid);
    if (rc < rMin) rMin = rc;
    if (rc > rMax) rMax = rc;
  };
  if (geom.index) {
    const idx = geom.index.array;
    for (let i = 0; i < idx.length; i += 3) {
      a.fromBufferAttribute(posAttr, idx[i]);
      b.fromBufferAttribute(posAttr, idx[i + 1]);
      c.fromBufferAttribute(posAttr, idx[i + 2]);
      scanTri(a, b, c);
    }
  } else {
    const count = posAttr.count;
    const pos = posAttr.array;
    for (let i = 0; i < count; i += 3) {
      a.fromArray(pos, (i + 0) * 3);
      b.fromArray(pos, (i + 1) * 3);
      c.fromArray(pos, (i + 2) * 3);
      scanTri(a, b, c);
    }
  }
  if (!isFinite(rMin) || !isFinite(rMax) || rMax <= rMin) return geom;
  const rThresh = (rMin + rMax) * 0.5;

  const keepTri = (va, vb, vc) => {
    e1.subVectors(vb, va);
    e2.subVectors(vc, va);
    n.crossVectors(e1, e2).normalize();
    if (!isVertical(n)) return true;
    centroid
      .copy(va)
      .add(vb)
      .add(vc)
      .multiplyScalar(1 / 3);
    return radius(centroid) >= rThresh - 1e-6;
  };

  if (geom.index) {
    const idx = geom.index.array;
    const newIdx = [];
    for (let i = 0; i < idx.length; i += 3) {
      const i0 = idx[i],
        i1 = idx[i + 1],
        i2 = idx[i + 2];
      a.fromBufferAttribute(posAttr, i0);
      b.fromBufferAttribute(posAttr, i1);
      c.fromBufferAttribute(posAttr, i2);
      if (keepTri(a, b, c)) newIdx.push(i0, i1, i2);
    }
    const newGeom = geom.clone();
    newGeom.setIndex(newIdx);
    newGeom.computeVertexNormals();
    newGeom.computeBoundingBox();
    newGeom.computeBoundingSphere();
    return newGeom;
  }

  // Non-indexed fallback
  const count = posAttr.count;
  const pos = posAttr.array;
  const hasUV = !!geom.getAttribute("uv");
  const hasColor = !!geom.getAttribute("color");
  const outPos = [];
  const outUV = hasUV ? [] : null;
  const outColor = hasColor ? [] : null;
  for (let i = 0; i < count; i += 3) {
    a.fromArray(pos, (i + 0) * 3);
    b.fromArray(pos, (i + 1) * 3);
    c.fromArray(pos, (i + 2) * 3);
    if (keepTri(a, b, c)) {
      outPos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
      if (outUV) {
        const uv = geom.getAttribute("uv");
        outUV.push(
          uv.getX(i + 0),
          uv.getY(i + 0),
          uv.getX(i + 1),
          uv.getY(i + 1),
          uv.getX(i + 2),
          uv.getY(i + 2)
        );
      }
      if (outColor) {
        const col = geom.getAttribute("color");
        outColor.push(
          col.getX(i + 0),
          col.getY(i + 0),
          col.getZ(i + 0),
          col.getX(i + 1),
          col.getY(i + 1),
          col.getZ(i + 1),
          col.getX(i + 2),
          col.getY(i + 2),
          col.getZ(i + 2)
        );
      }
    }
  }
  const newGeom = new THREE.BufferGeometry();
  newGeom.setAttribute("position", new THREE.Float32BufferAttribute(outPos, 3));
  if (outUV)
    newGeom.setAttribute("uv", new THREE.Float32BufferAttribute(outUV, 2));
  if (outColor)
    newGeom.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(outColor, 3)
    );
  newGeom.computeVertexNormals();
  newGeom.computeBoundingBox();
  newGeom.computeBoundingSphere();
  return newGeom;
}

function computeContactScaleFromGeom(
  topGeom,
  layoutRadius,
  modelScaleFactor,
  gapFraction
) {
  if (!topGeom || !topGeom.attributes || !topGeom.attributes.position)
    return 1.0;
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
  const { topPath = null, sidePath = null, layoutRadius = 0.5, gapFraction = 0.0, orientation = "flat" } = options;
  if (!topPath || !sidePath) throw new Error('loadHexModel: topPath and sidePath are required');
  const [gltfTop, gltfSide] = await Promise.all([loadGLTF(topPath), loadGLTF(sidePath)]);
  const topScene = gltfTop.scene || (gltfTop.scenes && gltfTop.scenes[0]);
  const sideScene = gltfSide.scene || (gltfSide.scenes && gltfSide.scenes[0]);
  if (!topScene || !sideScene) throw new Error(`loadHexModel: missing scene in either topPath=${topPath} or sidePath=${sidePath}`);
  const scene = new THREE.Group();
  scene.add(topScene);
  scene.add(sideScene);
  if (orientation === "flat") {
    scene.rotation.y = Math.PI / 6;
  }
  scene.updateWorldMatrix(true, true);
  // Fix normals if inverted
  scene.traverse((child) => {
    if (child.isMesh && child.geometry) {
      const geom = child.geometry;
      if (!geom.attributes.normal) geom.computeVertexNormals();
      geom.computeBoundingSphere();
      const center = geom.boundingSphere
        ? geom.boundingSphere.center
        : new THREE.Vector3();
      const pos = geom.attributes.position;
      const normal = geom.attributes.normal;
      let inward = 0;
      let total = 0;
      const tmpV = new THREE.Vector3();
      const tmpN = new THREE.Vector3();
      const step = Math.max(1, Math.floor(pos.count / 60));
      for (let i = 0; i < pos.count; i += step) {
        tmpV.fromBufferAttribute(pos, i).sub(center);
        tmpN.fromBufferAttribute(normal, i);
        if (tmpV.dot(tmpN) < 0) inward++;
        total++;
      }
      if (total > 0 && inward > total / 2) {
        geom.scale(-1, 1, 1);
        geom.computeVertexNormals();
      }
    }
  });

  // Extract geometries: prefer explicit topScene/sideScene meshes
  let topGeom = null;
  let sideGeom = null;
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
  // Fallback: if one missing, clone the other so we always return two geoms
  if (!topGeom && sideGeom) topGeom = sideGeom.clone();
  if (!sideGeom && topGeom) sideGeom = topGeom.clone();

  // Normalize
  recenterGeometry(topGeom);
  recenterGeometry(sideGeom);

  if (sideGeom) sideGeom = stripUpFacingCaps(sideGeom, 0.8);
  if (sideGeom) sideGeom = stripInwardFacingWalls(sideGeom);

  // Compute hexMaxY and modelScaleFactor/contactScale
  let hexMaxY = 1;
  if (topGeom && topGeom.attributes && topGeom.attributes.position) {
    topGeom.computeBoundingBox();
    sideGeom && sideGeom.computeBoundingBox();
    const topMaxY = topGeom.boundingBox ? topGeom.boundingBox.max.y : 1;
    const sideMaxY =
      sideGeom && sideGeom.boundingBox ? sideGeom.boundingBox.max.y : topMaxY;
    hexMaxY = Math.max(topMaxY, sideMaxY);
    const pos = topGeom.attributes.position;
    let maxR = 0;
    for (let i = 0; i < pos.count; i += 1) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const r = Math.hypot(x, z);
      if (r > maxR) maxR = r;
    }
    let modelScaleFactor = 1;
    if (maxR > 0) modelScaleFactor = layoutRadius / maxR;
    const suggested = computeContactScaleFromGeom(
      topGeom,
      layoutRadius,
      modelScaleFactor,
      gapFraction
    );
    const applied = Math.max(0.5, Math.min(1.5, suggested));
    return {
      topGeom,
      sideGeom,
      modelCenter: scene
        ? new THREE.Box3().setFromObject(scene).getCenter(new THREE.Vector3())
        : new THREE.Vector3(0, 0, 0),
      hexMaxY,
      modelScaleFactor,
      contactScale: applied,
      scene,
    };
  }

  return {
    topGeom,
    sideGeom,
    modelCenter: new THREE.Vector3(0, 0, 0),
    hexMaxY,
    modelScaleFactor: 1,
    contactScale: 1,
    scene,
  };
}

export async function loadLocationMarker(options = {}) {
  const {
    path = "/models/location-marker.glb",
    layoutRadius = 0.5,
    markerDesiredRadius = 0.6,
  } = options;
  const gltf = await loadGLTF(path);
  const marker = gltf.scene;
  marker.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(marker);
  const center = new THREE.Vector3();
  box.getCenter(center);
  const minY = box.min.y;
  const m = new THREE.Matrix4().makeTranslation(-center.x, -minY, -center.z);
  marker.traverse((child) => {
    if (child.isMesh) child.geometry && child.geometry.applyMatrix4(m);
  });
  const geomBox = new THREE.Box3().setFromObject(marker);
  const size = new THREE.Vector3();
  geomBox.getSize(size);
  geomBox.getCenter(center);
  const currentR = Math.max(size.x, size.z) * 0.5 || 1;
  const desiredR = layoutRadius * markerDesiredRadius;
  const s = desiredR / currentR;
  marker.scale.setScalar(s);
  const scaledBox = new THREE.Box3().setFromObject(marker);
  const scaledSize = new THREE.Vector3();
  scaledBox.getSize(scaledSize);
  const markerTopOffset = scaledSize.y;
  marker.visible = false;
  marker.matrixAutoUpdate = false;
  const tintMat = new THREE.MeshBasicMaterial({
    color: 0xb53a3a,
    transparent: true,
    opacity: 1.0,
    depthTest: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  marker.traverse((n) => {
    const mesh = n;
    if (mesh && mesh.isMesh) {
      mesh.material = tintMat;
      mesh.renderOrder = 4;
    }
  });
  return { marker, markerTopOffset };
}
