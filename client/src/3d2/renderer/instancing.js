import * as THREE from 'three';

// Helper to create an InstancedMesh with a small API for updating transforms.
export function createInstancedMesh(geometry, material, count) {
  const inst = new THREE.InstancedMesh(geometry, material, count);
  inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const dummy = new THREE.Object3D();

  function setInstanceMatrix(index, position = {x:0,y:0,z:0}, rotation = {x:0,y:0,z:0}, scale = {x:1,y:1,z:1}) {
    dummy.position.set(position.x, position.y, position.z);
    dummy.rotation.set(rotation.x, rotation.y, rotation.z);
    dummy.scale.set(scale.x, scale.y, scale.z);
    dummy.updateMatrix();
    inst.setMatrixAt(index, dummy.matrix);
    inst.instanceMatrix.needsUpdate = true;
  }

  function dispose() {
    try { geometry.dispose && geometry.dispose(); } catch (e) {}
    try { material.dispose && material.dispose(); } catch (e) {}
  }

  return { instancedMesh: inst, setInstanceMatrix, dispose };
}

export default { createInstancedMesh };
