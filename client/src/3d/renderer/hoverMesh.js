import * as THREE from 'three';

export function createHoverMesh(scene, topGeom, opts = {}) {
  if (!scene || !topGeom) return null;
  try {
    const hoverMat = new THREE.MeshBasicMaterial({
      color: opts.color ?? 0xffff66,
      transparent: true,
      opacity: opts.opacity ?? 0.35,
      depthTest: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const hoverMesh = new THREE.Mesh(topGeom, hoverMat);
    hoverMesh.visible = false;
    hoverMesh.matrixAutoUpdate = false;
    scene.add(hoverMesh);
    return hoverMesh;
  } catch (e) {
    console.debug('createHoverMesh error', e);
    return null;
  }
}
