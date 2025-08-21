// Minimal WorldGrid implementation for 3d2 domain (dependency-free)
// Provides basic axial coords helpers used by the scene and domain utilities.

import { axialToXZ, getHexSize } from '@/3d2/config/layout';

export class WorldGrid {
  /**
   * @param {number} scale visual/world scale of a hex (default 1 -> HEX_SIZE 2)
   */
  constructor(scale = 1) {
    this.scale = typeof scale === 'number' ? scale : 1;
  }

  // Basic hex size used by renderer conventions in the scene code
  _hexSize() {
  // map instance scale to centralized layout size
  return getHexSize({ layoutRadius: this.scale, spacingFactor: 1 });
  }

  // Convert axial (q,r) to world x,z (flat-top axial -> x,z)
  axialToWorld(q, r) {
  return axialToXZ(q, r, { layoutRadius: this.scale, spacingFactor: 1 });
  }

  // Approximate conversion from world x,z back to axial q,r
  worldToAxial(x, z) {
  const HEX_SIZE = this._hexSize();
  // inverse math for flat-top axial
  const q = (2 / 3) * (x / HEX_SIZE);
  const r = ((-1 / 3) * (x / HEX_SIZE)) + ((1 / Math.sqrt(3)) * (z / HEX_SIZE));
  // return fractional axial; callers can round if needed
  return { q, r };
  }

  // Return axial neighbors for q,r (6 neighbors)
  neighbors(q, r) {
    return [
      { q: q + 1, r: r },
      { q: q - 1, r: r },
      { q: q, r: r + 1 },
      { q: q, r: r - 1 },
      { q: q + 1, r: r - 1 },
      { q: q - 1, r: r + 1 },
    ];
  }

  // Simple axial distance (using cube coords via axial conversion)
  distance(a, b) {
    const aq = a.q, ar = a.r;
    const bq = b.q, br = b.r;
    const ax = aq;
    const az = ar;
    const ay = -ax - az;
    const bx = bq;
    const bz = br;
    const by = -bx - bz;
    return Math.max(Math.abs(ax - bx), Math.abs(ay - by), Math.abs(az - bz));
  }
}

export default WorldGrid;
