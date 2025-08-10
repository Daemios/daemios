import Grid from './Grid.js';

export default class HexGrid extends Grid {
  constructor({ size = 1 } = {}) {
    super();
    this.size = size;
    this.sqrt3 = Math.sqrt(3);
  }

  toWorld({ q, r }) {
    const x = this.size * this.sqrt3 * (q + r / 2);
    const y = -this.size * 1.5 * r;
    return { x, y, z: 0 };
  }

  toCoord({ x, y }) {
    const q = (x * 2 / (this.sqrt3 * this.size) - y / (3 * this.size));
    const r = -y / (1.5 * this.size);
    const rq = Math.round(q);
    const rr = Math.round(r);
    const rs = Math.round(-q - r);
    const qDiff = Math.abs(rq - q);
    const rDiff = Math.abs(rr - r);
    const sDiff = Math.abs(rs + q + r);
    let Q = rq; let R = rr;
    if (qDiff > rDiff && qDiff > sDiff) Q = -rr - rs;
    else if (rDiff > sDiff) R = -rq - rs;
    return { q: Q, r: R };
  }

  neighbors({ q, r }) {
    return [
      { q: q + 1, r }, { q: q - 1, r },
      { q, r + 1 }, { q, r - 1 },
      { q + 1, r - 1 }, { q - 1, r + 1 },
    ];
  }

  distance(a, b) {
    return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
  }

  ring(center, radius) {
    const results = [];
    let { q, r } = { q: center.q + radius, r: center.r - radius };
    const dirs = [
      [ -1, 0 ], [ 0, 1 ], [ -1, 1 ],
      [ 1, 0 ], [ 0, -1 ], [ 1, -1 ],
    ];
    dirs.forEach(([dq, dr]) => {
      for (let i = 0; i < radius; i += 1) {
        results.push({ q, r });
        q += dq; r += dr;
      }
    });
    return results;
  }

  raycastTileLine(a, b) {
    const N = this.distance(a, b);
    const results = [];
    for (let i = 0; i <= N; i += 1) {
      const t = N === 0 ? 0 : i / N;
      const q = a.q + (b.q - a.q) * t;
      const r = a.r + (b.r - a.r) * t;
      results.push(this.toCoord(this.toWorld({ q, r }))); // round
    }
    return results;
  }
}
