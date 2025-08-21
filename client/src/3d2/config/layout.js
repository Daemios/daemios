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

export default { BASE_HEX_SIZE, getHexSize, axialToXZ, hexSpacing };
