// shared/lib/worldgen/worldCoord.js
// Axial (q,r) -> deterministic Cartesian coordinates plus helper utilities.

const SQRT3 = Math.sqrt(3);

function clamp01(v) {
  if (v <= 0) return 0;
  if (v >= 1) return 1;
  return v;
}

class WorldCoord {
  constructor(q = 0, r = 0, opts = {}) {
    this.q = typeof q === 'number' ? q : 0;
    this.r = typeof r === 'number' ? r : 0;
    const hexSize = typeof opts.hexSize === 'number' ? opts.hexSize : 2.0;
    const spacing = typeof opts.spacing === 'number' ? opts.spacing : 1.0;
    this._scale = hexSize * spacing;
    const x = this._scale * 1.5 * this.q;
    const y = this._scale * SQRT3 * (this.r + this.q / 2);
    this.x = x;
    this.y = y;
  }

  getCartesian(scale = 1) {
    return { x: this.x * scale, y: this.y * scale };
  }

  distanceFromOrigin(scale = 1) {
    const dx = this.x * scale;
    const dy = this.y * scale;
    return Math.sqrt(dx * dx + dy * dy);
  }

  latitudeSigned(latScale = 512) {
    if (!latScale || !Number.isFinite(latScale)) return 0;
    const n = this.y / latScale;
    if (!Number.isFinite(n)) return 0;
    return Math.max(-1, Math.min(1, n));
  }

  normalizedLatitude(latScale = 512) {
    if (!latScale || !Number.isFinite(latScale)) return 0.5;
    const signed = this.latitudeSigned(latScale);
    // Smooth the extremes so we do not immediately clamp for large |y|.
    const eased = Math.tanh(signed * 1.2);
    return clamp01(0.5 + eased * 0.5);
  }
}

function axialToCartesian(q = 0, r = 0, opts = {}) {
  const c = new WorldCoord(q, r, opts);
  return c.getCartesian();
}

export { WorldCoord, axialToCartesian };
export default WorldCoord;
