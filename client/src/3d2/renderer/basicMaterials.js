import * as THREE from 'three';

export function createBasicColorMaterial(hexColor = 0xffffff, opts = {}) {
  const params = Object.assign({ color: hexColor }, opts);
  return new THREE.MeshStandardMaterial(params);
}

export function createUnlitMaterial(hexColor = 0xffffff, opts = {}) {
  const params = Object.assign({ color: hexColor }, opts);
  return new THREE.MeshBasicMaterial(params);
}

export default { createBasicColorMaterial, createUnlitMaterial };
