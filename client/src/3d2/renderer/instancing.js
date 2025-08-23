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
  // Ensure we operate on an InstancedMesh-like object
  const geom = inst.geometry;
  // Reuse existing attribute array when possible to avoid allocations
  if (inst.instanceColor && inst.instanceColor.array && inst.instanceColor.array.length === colors.length) {
    inst.instanceColor.array.set(colors);
    inst.instanceColor.needsUpdate = true;
    // Ensure attribute is attached to geometry for shader access / downstream code
    try {
      if (geom && geom.setAttribute) {
        geom.setAttribute('instanceColor', inst.instanceColor);
        // Also set the built-in 'color' attribute if geometry doesn't have one so
        // legacy shader paths that read 'color' continue to work.
        if (!geom.getAttribute('color')) geom.setAttribute('color', inst.instanceColor);
      }
    } catch (e) {
      // ignore geometry attachment failures
    }
    return;
  }
  // Create a new InstancedBufferAttribute and attach it to both the mesh and geometry
  const attr = new THREE.InstancedBufferAttribute(colors, 3);
  inst.instanceColor = attr;
  inst.instanceColor.needsUpdate = true;
  try {
    if (geom && geom.setAttribute) {
      geom.setAttribute('instanceColor', attr);
      if (!geom.getAttribute('color')) geom.setAttribute('color', attr);
    }
  } catch (e) {
    // ignore
  }
}

export default { createInstancedMesh, setInstanceColors };
