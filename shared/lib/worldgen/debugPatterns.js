// Small helpers for deterministic debug patterns used by worldgen layers.
// These ensure generator and client use identical math for test patterns.

import { axialToXZ } from './layout.js';

// Axial-aligned square: bounds on q and r directly (fast and discrete)
export function isInsideAxialSquare(q, r, centerQ, centerR, size) {
  return Math.abs(q - centerQ) <= size && Math.abs(r - centerR) <= size;
}

// World-axis-aligned square: convert axial to world XZ and test against
// an axis-aligned box centered at the given axial center. size counts hex widths.
export function isInsideWorldSquare(q, r, centerQ, centerR, size, { hexSize = 1 } = {}) {
  const c = axialToXZ(centerQ, centerR, { hexSize });
  const p = axialToXZ(q, r, { hexSize });
  const hexWidth = 1.5 * hexSize;
  const half = (size * hexWidth) / 2;
  return (Math.abs(p.x - c.x) <= half) && (Math.abs(p.z - c.z) <= half);
}

export default { isInsideAxialSquare, isInsideWorldSquare };
