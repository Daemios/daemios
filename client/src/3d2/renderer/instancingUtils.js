import * as THREE from 'three';

// ensureInstanceCapacity: allocate InstancedBufferAttribute storage for an InstancedMesh
export function ensureInstanceCapacity(instancedMesh, capacity) {
  if (!instancedMesh) return;
  const desired = Math.max(0, capacity | 0);
  if (instancedMesh.instanceMatrix && instancedMesh.instanceMatrix.array && (instancedMesh.instanceMatrix.array.length / 16) >= desired) {
    instancedMesh.count = desired;
    return;
  }
  const floatLen = Math.max(1, desired * 16);
  const newArr = new Float32Array(floatLen);
  if (instancedMesh.instanceMatrix && instancedMesh.instanceMatrix.array) {
    newArr.set(instancedMesh.instanceMatrix.array.subarray(0, Math.min(instancedMesh.instanceMatrix.array.length, newArr.length)), 0);
  }
  instancedMesh.instanceMatrix = new THREE.InstancedBufferAttribute(newArr, 16);
  if (instancedMesh.instanceColor) {
    const colorLen = Math.max(0, desired * 3);
    const newColor = new Float32Array(colorLen);
    if (instancedMesh.instanceColor.array) newColor.set(instancedMesh.instanceColor.array.subarray(0, Math.min(instancedMesh.instanceColor.array.length, newColor.length)), 0);
    instancedMesh.instanceColor = new THREE.InstancedBufferAttribute(newColor, 3);
  }
  instancedMesh.count = desired;
}

export default { ensureInstanceCapacity };
