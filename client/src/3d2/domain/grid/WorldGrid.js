// Minimal WorldGrid implementation for 3d2 domain (dependency-free)
// Provides basic coordinate helpers used by the scene and domain utilities.

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

  // Convert cell index to world x,z. Accepts either {q,r} or packed index.
  cellToWorld(idx) {
    const { q, r } = typeof idx === 'object' ? idx : this._fromIndex(idx);
    return axialToXZ(q, r, { layoutRadius: this.scale, spacingFactor: 1 });
  }

  // Approximate conversion from world x,z back to a cell index
  worldToCell(x, z) {
    const HEX_SIZE = this._hexSize();
    // inverse math for flat-top axial
    const q = (2 / 3) * (x / HEX_SIZE);
    const r = ((-1 / 3) * (x / HEX_SIZE)) + ((1 / Math.sqrt(3)) * (z / HEX_SIZE));
    // return rounded axial as cell index
    return { q: Math.round(q), r: Math.round(r) };
  }

  // Simple distance (using cube coords via axial conversion)
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

  // Optional helpers for packed indices if callers provide numeric keys
  _fromIndex(i) {
    if (typeof i === 'string') {
      const [q, r] = i.split(',').map(Number);
      return { q, r };
    }
    // if numeric assume simple packing via bit shifting
    const q = (i >> 16) | 0;
    const r = (i & 0xffff) << 16 >> 16; // sign extend
    return { q, r };
  }
}

export default WorldGrid;
