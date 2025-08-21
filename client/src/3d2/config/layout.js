// Centralized hex layout helpers for 3d2
// Exports a single axialToXZ function and a getHexSize helper.

// Base hex size (world units) when layoutRadius=1 and spacingFactor=1.
export const BASE_HEX_SIZE = 2.0;

export function getHexSize({ layoutRadius = 1, spacingFactor = 1 } = {}) {
  return BASE_HEX_SIZE * (layoutRadius || 1) * (spacingFactor || 1);
}

// Convert axial coordinates (q, r) to world X,Z using flat-top hex layout.
export function axialToXZ(q, r, { layoutRadius = 1, spacingFactor = 1 } = {}) {
  const hexSize = getHexSize({ layoutRadius, spacingFactor });
  const x = hexSize * 1.5 * (typeof q === 'number' ? q : 0);
  const z = hexSize * Math.sqrt(3) * ((typeof r === 'number' ? r : 0) + (typeof q === 'number' ? q : 0) / 2);
  return { x, z };
}

export function hexSpacing({ layoutRadius = 1, spacingFactor = 1 } = {}) {
  const hexSize = getHexSize({ layoutRadius, spacingFactor });
  return { width: hexSize * 1.5, height: hexSize * Math.sqrt(3) };
}

// Convert world X,Z back to fractional axial coordinates for flat-top layout.
export function worldXZToAxial(x, z, { layoutRadius = 1, spacingFactor = 1 } = {}) {
  const hexSize = getHexSize({ layoutRadius, spacingFactor });
  const q = (2 / 3) * (x / hexSize);
  const r = (z / (hexSize * Math.sqrt(3))) - q / 2;
  return { q, r };
}

// Round fractional axial coordinates to nearest integer axial coordinates (using cube rounding)
export function roundAxial(qf, rf) {
  const x = qf;
  const z = rf;
  const y = -x - z;
  let rx = Math.round(x);
  let ry = Math.round(y);
  let rz = Math.round(z);
  const xDiff = Math.abs(rx - x);
  const yDiff = Math.abs(ry - y);
  const zDiff = Math.abs(rz - z);
  if (xDiff > yDiff && xDiff > zDiff) rx = -ry - rz;
  else if (yDiff > zDiff) ry = -rx - rz;
  else rz = -rx - ry;
  return { q: rx, r: rz };
}

export default { BASE_HEX_SIZE, getHexSize, axialToXZ, hexSpacing };
