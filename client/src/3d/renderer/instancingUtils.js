import * as THREE from 'three';

// Ensure an InstancedMesh has capacity for at least desiredCount instances.
// If needed, grows attributes (instanceMatrix and any InstancedBufferAttributes)
// using an amortized growth factor, copying existing data into new arrays.
// Returns the new capacity (number of instance slots).
export function ensureInstanceCapacity(im, desiredCount, opts = {}) {
  if (!im || !im.geometry || !im.instanceMatrix) {
    // best-effort: if missing shape, try to set count and bail
    try { im.count = desiredCount; } catch (e) {}
    return 0;
  }
  const growthFactor = opts.growthFactor || 1.5;
  const minCap = opts.minCapacity || 16;
  // Determine current capacity from instanceMatrix attribute length
  const matAttr = im.instanceMatrix;
  const matItemSize = 16;
  const currCap = matAttr && matAttr.array ? Math.floor(matAttr.array.length / matItemSize) : (im.count | 0);
  const desired = Math.max(0, desiredCount | 0);
  if (desired <= currCap) {
    // capacity sufficient; just set count
    im.count = desired;
    return currCap;
  }
  // Grow capacity amortized
  const grown = Math.max(desired, Math.max(minCap, Math.ceil(currCap * growthFactor)));
  const newCap = Math.min(grown, opts.maxCap || Number.MAX_SAFE_INTEGER);

  // Replace instanceMatrix attribute
  try {
    const oldMatAttr = matAttr;
    const OldArrCtor = oldMatAttr.array.constructor || Float32Array;
    const newMatArray = new OldArrCtor(newCap * matItemSize);
    if (oldMatAttr.array && oldMatAttr.array.length > 0) {
      newMatArray.set(oldMatAttr.array.subarray(0, currCap * matItemSize), 0);
    }
    const newMatAttr = new THREE.InstancedBufferAttribute(newMatArray, matItemSize);
    newMatAttr.setUsage(oldMatAttr.usage || THREE.DynamicDrawUsage);
    // dispose old GL buffer if present
    try { if (oldMatAttr && oldMatAttr.dispose) oldMatAttr.dispose(); } catch (e) {}
    im.geometry.setAttribute('instanceMatrix', newMatAttr);
  } catch (e) {
    // If anything goes wrong, don't leave mesh in broken state; throw for visibility
    console.error('ensureInstanceCapacity: failed to grow instanceMatrix', e);
    throw e;
  }

  // Grow any other instanced attributes (instanceColor, iCenter, etc.) if present
  const attrs = im.geometry.attributes || {};
  for (const name of Object.keys(attrs)) {
    if (name === 'instanceMatrix') continue;
    const a = attrs[name];
    if (!a || !a.array) continue;
    const itemSize = a.itemSize || 1;
    const currAttrCap = Math.floor(a.array.length / itemSize);
    if (currAttrCap >= newCap) continue;
    try {
      const Ctor = a.array.constructor || Float32Array;
      const newArr = new Ctor(newCap * itemSize);
      if (a.array && a.array.length > 0) newArr.set(a.array.subarray(0, currAttrCap * itemSize), 0);
      const newAttr = new THREE.InstancedBufferAttribute(newArr, itemSize);
      newAttr.setUsage(a.usage || THREE.DynamicDrawUsage);
      try { if (a && a.dispose) a.dispose(); } catch (e) {}
      im.geometry.setAttribute(name, newAttr);
    } catch (e) {
      console.warn('ensureInstanceCapacity: failed to grow attribute', name, e);
    }
  }

  // Mark updates
  try {
    if (im.instanceMatrix) im.instanceMatrix.needsUpdate = true;
    for (const name of Object.keys(im.geometry.attributes || {})) {
      const a = im.geometry.attributes[name];
      if (a) a.needsUpdate = true;
    }
  } catch (e) {}

  // Finally set the visible count to desired
  im.count = desired;
  return newCap;
}

export default { ensureInstanceCapacity };
