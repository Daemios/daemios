// shared/lib/worldgen/utils/worldCoord.js
// Axial (q, r) -> Cartesian helper with deterministic normalization helpers.

function clamp(v, min, max) {
  if (v <= min) return min;
  if (v >= max) return max;
  return v;
}

class WorldCoord {
  constructor(q = 0, r = 0, opts = {}) {
    this.q = typeof q === 'number' ? q : 0;
    this.r = typeof r === 'number' ? r : 0;
    this.hexSize = typeof opts.hexSize === 'number' ? opts.hexSize : 2.0;
    if (typeof opts.x === 'number' && typeof opts.z === 'number') {
      this.x = opts.x;
      this.z = opts.z;
    } else {
      const size = this.hexSize;
      this.x = size * 1.5 * this.q;
      this.z = size * Math.sqrt(3) * (this.r + this.q / 2);
    }
    this.latitudeScale = typeof opts.latitudeScale === 'number' ? opts.latitudeScale : 2400;
    this.radiusScale = typeof opts.radiusScale === 'number' ? opts.radiusScale : 4200;
  }

  clone() {
    return new WorldCoord(this.q, this.r, {
      hexSize: this.hexSize,
      x: this.x,
      z: this.z,
      latitudeScale: this.latitudeScale,
      radiusScale: this.radiusScale,
    });
  }

  get normalizedLatitude() {
    const scale = Math.max(1e-6, this.latitudeScale);
    return clamp(this.z / scale, -1, 1);
  }

  get radialDistance() {
    return Math.sqrt(this.x * this.x + this.z * this.z);
  }

  get normalizedDistance() {
    const scale = Math.max(1e-6, this.radiusScale);
    return clamp(this.radialDistance / scale, 0, 1);
  }
}

function ensureWorldCoord(ctx) {
  if (ctx && ctx.coord instanceof WorldCoord) return ctx.coord;
  const q = ctx && typeof ctx.q === 'number' ? ctx.q : 0;
  const r = ctx && typeof ctx.r === 'number' ? ctx.r : 0;
  const opts = {};
  if (ctx && typeof ctx.x === 'number' && typeof ctx.z === 'number') {
    opts.x = ctx.x;
    opts.z = ctx.z;
  }
  if (ctx && typeof ctx.hexSize === 'number') opts.hexSize = ctx.hexSize;
  if (ctx && typeof ctx.latitudeScale === 'number') opts.latitudeScale = ctx.latitudeScale;
  if (ctx && typeof ctx.radiusScale === 'number') opts.radiusScale = ctx.radiusScale;
  const coord = new WorldCoord(q, r, opts);
  if (ctx) ctx.coord = coord;
  return coord;
}

export { WorldCoord, ensureWorldCoord };
