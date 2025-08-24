// Minimal SquareGrid implementation sharing the WorldGrid interface.
// Uses direct Cartesian math for cell/world conversions.

export class SquareGrid {
  /**
   * @param {number} scale visual/world size of a cell (default 1)
   */
  constructor(scale = 1) {
    this.scale = typeof scale === 'number' ? scale : 1;
  }

  _cellSize() {
    return this.scale;
  }

  // Convert cell coordinates {x,z} or packed index to world x,z
  cellToWorld(idx) {
    const { x, z } = typeof idx === 'object' ? this._normalizeCell(idx) : this._fromIndex(idx);
    const size = this._cellSize();
    return { x: x * size, z: z * size };
  }

  // Convert world x,z to cell coordinates {x,z}
  worldToCell(x, z) {
    const size = this._cellSize();
    return { x: Math.round(x / size), z: Math.round(z / size) };
  }

  // Chebyshev distance (4 or 8-neighbor compatible)
  distance(a, b) {
    const ax = a.x, az = a.z;
    const bx = b.x, bz = b.z;
    return Math.max(Math.abs(ax - bx), Math.abs(az - bz));
  }

  _fromIndex(i) {
    if (typeof i === 'string') {
      const [x, z] = i.split(',').map(Number);
      return { x, z };
    }
    const x = (i >> 16) | 0;
    const z = (i & 0xffff) << 16 >> 16;
    return { x, z };
  }

  _normalizeCell(obj) {
    return { x: obj.x ?? 0, z: obj.z ?? 0 };
  }
}

export default SquareGrid;
