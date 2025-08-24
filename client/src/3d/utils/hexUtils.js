import * as THREE from "three";
import { axialToXZ } from '../..//3d2/config/layout';

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
  // Delegate to canonical axialToXZ to ensure a single source of truth for placement
  const { x, z } = axialToXZ(q, r, { layoutRadius, spacingFactor });
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
