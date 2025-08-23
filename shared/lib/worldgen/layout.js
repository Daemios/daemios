// Minimal axial->world helper for shared worldgen so debug patterns can
// align with client world XZ math. Uses flat-top hex layout and unit hex size
// by default; caller may scale by a constant if desired.
export function axialToXZ(q, r, { hexSize = 1 } = {}) {
  const hexWidth = 1.5 * hexSize;
  const hexHeight = Math.sqrt(3) * hexSize;
  const x = hexWidth * q;
  const z = hexHeight * (r + q / 2);
  return { x, z };
}

export default { axialToXZ };
