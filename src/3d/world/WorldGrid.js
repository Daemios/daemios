// WorldGrid: produces world cell data (height, biome, colors) independent from rendering.
// Minimal contract:
// - constructor(options): { layoutRadius, gridSize, elevation, noiseConfig }
// - getCell(q, r): returns { q, r, hRaw, h, f, t, biome, colorTop, colorSide }
// - forEach(callback): iterate over axial coords in current bounds
// - toIndex(q,r) / fromIndex(i)

import * as THREE from 'three';
import { createWorldGenerator } from './generation';

export default class WorldGrid {
  constructor(opts = {}) {
    this.layoutRadius = opts.layoutRadius ?? 0.5;
    this.gridSize = opts.gridSize ?? 20;
    this.elevation = opts.elevation ?? { base: 0.08, max: 1.35 };
    // Configurable vertical exaggeration to make mountains pop
    this.verticalExaggeration = opts.verticalExaggeration ?? {
      highland: 1.25,
      mountain: 1.75,
      peak: 2.0,
      coast: 0.98,
      ridgeBonus: 0.25, // additional up to this factor scaled by ridge (0..1)
    };
    this.seed = opts.seed ?? 1337;
    this.generationScale = opts.generationScale != null ? opts.generationScale : 1.0;
    this.generatorVersion = opts.generatorVersion || '2.0';
    this._generatorTuning = opts.generatorTuning || null;

    // Stateless world generator (pure per-hex); one instance reused
    this.hexGen = createWorldGenerator(this.generatorVersion, this.seed);
    if (this._generatorTuning && this.hexGen.setTuning) this.hexGen.setTuning(this._generatorTuning);

    // scratch
    this._tmpColor = new THREE.Color();

  // Memoization cache for per-hex results to avoid recomputation across frames
  this._cacheVersion = 0;
  // Single-level cache keyed by packed key to avoid nested maps
  // Prefer bigint packing when available; otherwise fall back to string keys
  this._cellCache = new Map(); // Map<bigint|string, cell>
  const hasBigInt = typeof BigInt === 'function';
  this._packKey = hasBigInt
    ? ((q, r) => ((BigInt(q) << 32n) ^ (BigInt(r) & 0xffffffffn)))
    : ((q, r) => `${q},${r}`);
  this._cacheSize = 0;
  this._cacheLimit = (2 * this.gridSize + 1) * (2 * this.gridSize + 1); // at least one full grid
  }

  // Update generator tuning parameters at runtime
  setGeneratorTuning(tuning) {
    this._generatorTuning = { ...(this._generatorTuning || {}), ...(tuning || {}) };
    if (this.hexGen && this.hexGen.setTuning) this.hexGen.setTuning(this._generatorTuning);
    this.invalidateCache();
  }

  // Swap the active generator algorithm by version key
  setGeneratorVersion(version) {
    if (!version || version === this.generatorVersion) return;
    this.generatorVersion = version;
    this.hexGen = createWorldGenerator(this.generatorVersion, this.seed);
    // Reset tuning so new generator's defaults take effect
    this._generatorTuning = null;
    this.invalidateCache();
  }

  // Optional setter for generation scale with cache invalidation
  setGenerationScale(scale) {
    if (scale != null && isFinite(scale) && scale > 0) {
      this.generationScale = Number(scale);
      this.invalidateCache();
    }
  }

  // Bump cache version and clear backing map
  invalidateCache() {
    this._cacheVersion = (this._cacheVersion + 1) >>> 0;
  this._cellCache.clear();
  this._cacheSize = 0;
  }

  bounds() {
    const s = this.gridSize;
    return { minQ: -s, maxQ: s, minR: -s, maxR: s };
  }

  indexCount() {
    const s = this.gridSize;
    return (2 * s + 1) * (2 * s + 1);
  }

  toIndex(q, r) {
    const s = this.gridSize;
    return (q + s) * (2 * s + 1) + (r + s);
  }

  fromIndex(i) {
    const s = this.gridSize;
    const side = 2 * s + 1;
    const q = Math.floor(i / side) - s;
    const r = (i % side) - s;
    return { q, r };
  }

  forEach(fn) {
    const s = this.gridSize;
    for (let q = -s; q <= s; q += 1) {
      for (let r = -s; r <= s; r += 1) {
        fn(q, r);
      }
    }
  }

  getCell(q, r) {
    // Fast path: serve from cache when available
    const k = this._packKey(q, r);
    const cached = this._cellCache.get(k);
    if (cached) return cached;

    const maxHeight = this.elevation.max;
    const s = (this.generationScale && isFinite(this.generationScale) && this.generationScale > 0)
      ? this.generationScale : 1.0;
    const gen = this.hexGen.get(q / s, r / s);

    const hRaw = gen.fields?.h ?? 0;
    let yScale = this.elevation.base + hRaw * maxHeight;

    // Vertical exaggeration based on elevation band and ridge strength
    const ridge = gen.fields?.ridge ?? 0;
    const elevBand = gen.elevationBand;
    let exaggeration = 1.0;
    const exConf = this.verticalExaggeration || {};
    if (elevBand === 'Highland') {
      exaggeration = (exConf.highland ?? 1.25) + (exConf.ridgeBonus ?? 0.25) * ridge * 0.4;
    } else if (elevBand === 'Mountain') {
      exaggeration = (exConf.mountain ?? 1.75) + (exConf.ridgeBonus ?? 0.25) * ridge * 0.8;
    } else if (elevBand === 'Peak') {
      exaggeration = (exConf.peak ?? 2.0) + (exConf.ridgeBonus ?? 0.25) * ridge;
    } else if (elevBand === 'Coast') {
      exaggeration = (exConf.coast ?? 0.98);
    }
    yScale *= exaggeration;

    const hVisual = Math.max(0, Math.min(1, (yScale - this.elevation.base) / maxHeight));

    const colorTop = this._tmpColor.setHex(gen.color).clone();
    const colorSide = colorTop.clone().multiplyScalar(0.7);

    const cell = {
      q, r,
      hRaw, h: hVisual,
      f: gen.fields?.moisture ?? 0.5,
      t: gen.fields?.temp ?? 0.5,
      biome: gen.biome,
      colorTop,
      colorSide,
      yScale,
      gen,
    };

    // Cache bookkeeping
    if (!this._cellCache.has(k)) this._cacheSize += 1;
    this._cellCache.set(k, cell);
    if (this._cacheSize > this._cacheLimit * 2) {
      this._cellCache.clear();
      this._cacheSize = 0;
    }
    return cell;
  }
}
