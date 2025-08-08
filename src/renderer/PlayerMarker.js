// PlayerMarker: manages a visual indicator for player position independent from terrain meshes.
// Minimal API:
// - setPosition(q,r,matrixProvider): places marker using instance matrix of target cell
// - addTo(scene) / removeFrom(scene)

import * as THREE from 'three';

export default class PlayerMarker {
  constructor(geometry = null) {
    const geom = geometry || new THREE.RingGeometry(0.35, 0.5, 32);
    const mat = new THREE.MeshBasicMaterial({ color: 0xb53a3a, transparent: true, opacity: 1.0, depthTest: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    this.mesh = new THREE.Mesh(geom, mat);
    this.mesh.renderOrder = 3; // draw after water to ensure visibility on water
  // Note: matrixAutoUpdate=false; orientation is driven by composed matrix below
    this.mesh.visible = false;
    this.mesh.matrixAutoUpdate = false;
  // Internal state for placement and yaw-only facing
  this._pos = new THREE.Vector3();
  this._scale = new THREE.Vector3(1, 1, 1);
  this._yaw = 0;
  this._tmpQuat = new THREE.Quaternion();
  this._tmpPos = new THREE.Vector3();
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
    this._pos.copy(this._tmpPos);
    this._pos.y += 0.01;
    this._scale.copy(this._tmpScale);
    this._compose();
  }

  // Rotate around Y to face camera (billboard without tilt)
  faceCamera(camera) {
    if (!camera || !this.mesh.visible) return;
    const dx = camera.position.x - this._pos.x;
    const dz = camera.position.z - this._pos.z;
  // Face camera; add 90° to account for model forward axis
  this._yaw = Math.atan2(dx, dz) + Math.PI / 2;
    this._compose();
  }

  _compose() {
  const yQuat = new THREE.Quaternion().setFromAxisAngle(ClutterMarkerShared.UP, this._yaw);
    this.mesh.matrix.compose(this._pos, yQuat, this._scale);
    this.mesh.visible = true;
  }
}

// Shared constants to avoid re-allocations/pay attention to import cycles
const ClutterMarkerShared = {
  UP: new THREE.Vector3(0, 1, 0),
};
