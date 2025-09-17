const SQRT3 = Math.sqrt(3);
const BASE_HEX_SIZE = 2.0;
const DEFAULT_LATITUDE_SCALE = BASE_HEX_SIZE * 96;

function clamp(value, min, max) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function axialToCube(q = 0, r = 0) {
  const x = q;
  const z = r;
  const y = -x - z;
  return { x, y, z };
}

function computeLatitudeNormalized(worldY, scale, method = 'tanh') {
  if (!Number.isFinite(scale) || Math.abs(scale) < 1e-6) scale = 1;
  const normalized = worldY / scale;
  if (method === 'linear') return clamp(normalized, -1, 1);
  if (method === 'atan') return clamp(Math.atan(normalized) / (Math.PI / 2), -1, 1);
  return clamp(Math.tanh(normalized), -1, 1);
}

export class WorldCoord {
  constructor(opts = {}) {
    const {
      q = 0,
      r = 0,
      layoutRadius = 1,
      spacingFactor = 1,
      hexSize,
      latitudeScale,
      latitudeMethod = 'tanh'
    } = opts || {};

    this.q = Number.isFinite(q) ? q : 0;
    this.r = Number.isFinite(r) ? r : 0;
    this.layoutRadius = Number.isFinite(layoutRadius) ? layoutRadius : 1;
    this.spacingFactor = Number.isFinite(spacingFactor) ? spacingFactor : 1;

    const resolvedHexSize = (typeof hexSize === 'number' && Number.isFinite(hexSize) && hexSize > 0)
      ? hexSize
      : BASE_HEX_SIZE * this.layoutRadius * this.spacingFactor;

    this.hexSize = resolvedHexSize;

    const worldX = resolvedHexSize * 1.5 * this.q;
    const worldY = resolvedHexSize * SQRT3 * (this.r + this.q / 2);

    this.x = worldX;
    this.z = worldY;
    this.y = worldY;

    this.world = { x: worldX, y: worldY };
    this.cube = axialToCube(this.q, this.r);

    const baseLatScale = DEFAULT_LATITUDE_SCALE * (resolvedHexSize / BASE_HEX_SIZE);
    this.latitudeScale = (typeof latitudeScale === 'number' && Number.isFinite(latitudeScale) && latitudeScale > 0)
      ? latitudeScale
      : baseLatScale;
    this.latitudeMethod = latitudeMethod;

    this.latitudeNormalized = computeLatitudeNormalized(this.world.y, this.latitudeScale, this.latitudeMethod);
    this.latitude01 = (this.latitudeNormalized + 1) * 0.5;
  }

  get key() {
    return `${this.q}:${this.r}`;
  }

  offset(dq = 0, dr = 0, extra = {}) {
    return new WorldCoord({
      q: this.q + (Number.isFinite(dq) ? dq : 0),
      r: this.r + (Number.isFinite(dr) ? dr : 0),
      layoutRadius: this.layoutRadius,
      spacingFactor: this.spacingFactor,
      hexSize: this.hexSize,
      latitudeScale: this.latitudeScale,
      latitudeMethod: this.latitudeMethod,
      ...extra
    });
  }

  distanceTo(other) {
    if (!other) return 0;
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  axialDistanceTo(other) {
    if (!other || !other.cube) return 0;
    const a = this.cube;
    const b = other.cube;
    return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y), Math.abs(a.z - b.z));
  }

  bearingTo(other) {
    if (!other) return 0;
    const dx = other.x - this.x;
    const dy = other.y - this.y;
    return Math.atan2(dy, dx);
  }

  withLatitudeScale(newScale) {
    const scale = (typeof newScale === 'number' && Number.isFinite(newScale) && newScale > 0)
      ? newScale
      : this.latitudeScale;
    return new WorldCoord({
      q: this.q,
      r: this.r,
      layoutRadius: this.layoutRadius,
      spacingFactor: this.spacingFactor,
      hexSize: this.hexSize,
      latitudeScale: scale,
      latitudeMethod: this.latitudeMethod
    });
  }

  toObject() {
    return {
      q: this.q,
      r: this.r,
      x: this.x,
      y: this.y,
      z: this.z,
      latitudeNormalized: this.latitudeNormalized,
      latitude01: this.latitude01
    };
  }

  toJSON() {
    return this.toObject();
  }

  static axialToWorld(q = 0, r = 0, opts = {}) {
    const {
      layoutRadius = 1,
      spacingFactor = 1,
      hexSize
    } = opts || {};
    const resolvedHexSize = (typeof hexSize === 'number' && Number.isFinite(hexSize) && hexSize > 0)
      ? hexSize
      : BASE_HEX_SIZE * layoutRadius * spacingFactor;
    return {
      x: resolvedHexSize * 1.5 * q,
      y: resolvedHexSize * SQRT3 * (r + q / 2)
    };
  }

  static fromWorld(x = 0, y = 0, opts = {}) {
    const { layoutRadius = 1, spacingFactor = 1, hexSize } = opts || {};
    const resolvedHexSize = (typeof hexSize === 'number' && Number.isFinite(hexSize) && hexSize > 0)
      ? hexSize
      : BASE_HEX_SIZE * layoutRadius * spacingFactor;
    const q = (2 / 3) * (x / resolvedHexSize);
    const r = ((-1 / 3) * (x / resolvedHexSize)) + ((1 / SQRT3) * (y / resolvedHexSize));
    return new WorldCoord({ q, r, layoutRadius, spacingFactor, hexSize: resolvedHexSize });
  }
}

export function axialDistance(a, b) {
  if (!a || !b) return 0;
  const ac = a instanceof WorldCoord ? a.cube : axialToCube(a.q, a.r);
  const bc = b instanceof WorldCoord ? b.cube : axialToCube(b.q, b.r);
  return Math.max(Math.abs(ac.x - bc.x), Math.abs(ac.y - bc.y), Math.abs(ac.z - bc.z));
}

export function latitudeFromWorldY(worldY, scale, method = 'tanh') {
  return computeLatitudeNormalized(worldY, scale, method);
}

export default { WorldCoord, axialDistance, latitudeFromWorldY };
