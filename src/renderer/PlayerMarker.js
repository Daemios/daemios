// PlayerMarker: manages a visual indicator for player position independent from terrain meshes.
// Minimal API:
// - setPosition(q,r,matrixProvider): places marker using instance matrix of target cell
// - addTo(scene) / removeFrom(scene)

import * as THREE from 'three';

export default class PlayerMarker {
  constructor(geometry = null) {
    const geom = geometry || new THREE.RingGeometry(0.35, 0.5, 32);
    const mat = new THREE.MeshBasicMaterial({ color: 0x66ccff, transparent: true, opacity: 0.8, depthTest: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    this.mesh = new THREE.Mesh(geom, mat);
    this.mesh.rotation.x = -Math.PI / 2; // lay flat on top
    this.mesh.visible = false;
    this.mesh.matrixAutoUpdate = false;
    this._tmpPos = new THREE.Vector3();
    this._tmpQuat = new THREE.Quaternion();
    this._tmpScale = new THREE.Vector3();
  }

  addTo(scene) { scene.add(this.mesh); }
  removeFrom(scene) { scene.remove(this.mesh); }

  setPosition(instanceIndex, instanceMesh) {
    if (!instanceMesh || instanceIndex == null) return;
    const m = new THREE.Matrix4();
    instanceMesh.getMatrixAt(instanceIndex, m);
    // Slightly raise to avoid z-fighting with top
    m.decompose(this._tmpPos, this._tmpQuat, this._tmpScale);
    this._tmpPos.y += 0.01;
    this.mesh.matrix.compose(this._tmpPos, this._tmpQuat, this._tmpScale);
    this.mesh.visible = true;
  }
}
