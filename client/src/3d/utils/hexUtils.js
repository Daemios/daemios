import * as THREE from "three";

export function offsetToAxial(col, row) {
  const q = col;
  const r = row - Math.floor(col / 2);
  return { q, r };
}

export function axialToOffset(q, r) {
  const col = q;
  const row = r + Math.floor(q / 2);
  return { col, row };
}

export function getTileWorldPos(q, r, layoutRadius = 0.5, spacingFactor = 1.0) {
  const hexWidth = layoutRadius * 1.5 * spacingFactor;
  const hexHeight = Math.sqrt(3) * layoutRadius * spacingFactor;
  const x = hexWidth * q;
  const z = hexHeight * (r + q / 2);
  return { x, z };
}

export function pastelColorForChunk(wx, wy) {
  // Stable-ish pseudo-random hue from integer coords
  const seed = Math.sin(wx * 12.9898 + wy * 78.233) * 43758.5453;
  const h = seed - Math.floor(seed);
  const s = 0.45;
  const l = 0.68;
  const c = new THREE.Color();
  c.setHSL(h, s, l);
  return c;
}
