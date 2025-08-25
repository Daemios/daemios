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

  // Convert cell index to world x,z. Accepts either {x,z} or packed index.
  cellToWorld(idx) {
    const { x, z } = typeof idx === 'object' ? this._normalizeCell(idx) : this._fromIndex(idx);
    return axialToXZ(x, z, { layoutRadius: this.scale, spacingFactor: 1 });
  }

  // Approximate conversion from world x,z back to a cell index
  worldToCell(x, z) {
    const HEX_SIZE = this._hexSize();
    // inverse math for flat-top axial
    const q = (2 / 3) * (x / HEX_SIZE);
    const r = ((-1 / 3) * (x / HEX_SIZE)) + ((1 / Math.sqrt(3)) * (z / HEX_SIZE));
    // return rounded axial as cell index using common {x,z} keys
    return { x: Math.round(q), z: Math.round(r) };
  }

  // Simple distance (using cube coords via axial conversion)
  distance(a, b) {
    const ax = a.x ?? a.q;
    const az = a.z ?? a.r;
    const bx = b.x ?? b.q;
    const bz = b.z ?? b.r;
    const ay = -ax - az;
    const by = -bx - bz;
    return Math.max(Math.abs(ax - bx), Math.abs(ay - by), Math.abs(az - bz));
  }

  // Optional helpers for packed indices if callers provide numeric keys
  _fromIndex(i) {
    if (typeof i === 'string') {
      const [x, z] = i.split(',').map(Number);
      return { x, z };
    }
    // if numeric assume simple packing via bit shifting
    const x = (i >> 16) | 0;
    const z = (i & 0xffff) << 16 >> 16; // sign extend
    return { x, z };
  }

  // normalize accepts {q,r} or {x,z}
  _normalizeCell(obj) {
    return { x: obj.x ?? obj.q ?? 0, z: obj.z ?? obj.r ?? 0 };
  }
}

export default WorldGrid;
