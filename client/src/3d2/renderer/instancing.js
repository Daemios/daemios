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

// Helper: set per-instance colors on an InstancedMesh while attempting to reuse
// an existing InstancedBufferAttribute.array when possible to avoid allocations.
export function setInstanceColors(inst, colors) {
  if (!inst) return;
  // If an existing InstancedBufferAttribute exists and matches length, reuse it.
  if (inst.instanceColor && inst.instanceColor.array && inst.instanceColor.array.length === colors.length) {
    inst.instanceColor.array.set(colors);
    inst.instanceColor.needsUpdate = true;
    // Ensure the attribute is attached to geometry so the shader can read it.
      try {
        if (inst.geometry && typeof inst.geometry.setAttribute === 'function') {
          // Attach under both 'instanceColor' and 'color' so shaders that
          // expect vertex colors (attribute name 'color') will find the data.
          inst.geometry.setAttribute('instanceColor', inst.instanceColor);
          // Only set 'color' if it's not already present to avoid overwriting
          // any per-vertex color attributes on non-instanced geometries.
          if (!inst.geometry.getAttribute('color')) {
            inst.geometry.setAttribute('color', inst.instanceColor);
          }
        }
      } catch (e) {
        // ignore attachment failures; attribute still exists on the mesh instance
      }
    return;
  }

  // Create new attribute and attach it to the mesh geometry so the GPU shader
  // receives per-instance color data under the name `instanceColor`.
  inst.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
  inst.instanceColor.needsUpdate = true;
  try {
    if (inst.geometry && typeof inst.geometry.setAttribute === 'function') {
      inst.geometry.setAttribute('instanceColor', inst.instanceColor);
      // Also attach under 'color' when not present so shaders that expect
      // a vertex color attribute find the per-instance data.
      if (!inst.geometry.getAttribute('color')) {
        inst.geometry.setAttribute('color', inst.instanceColor);
      }
    }
  } catch (e) {
    // ignore attachment failures; attribute still exists on the mesh instance
  }
}

export default { createInstancedMesh, setInstanceColors };
