// WorldGrid: produces world cell data (height, biome, colors) independent from rendering.
// Minimal contract:
// - constructor(options): { layoutRadius, gridSize, elevation, noiseConfig }
// - getCell(q, r): returns { q, r, hRaw, h, f, t, biome, colorTop, colorSide }
// - forEach(callback): iterate over axial coords in current bounds
// - toIndex(q,r) / fromIndex(i)

import * as THREE from 'three';
import SimplexNoise from 'simplex-noise';
import { biomeColor, classifyBiome, BIOME_THRESHOLDS } from '../terrain/biomes';
import { createWorldGenerator } from './generation';

export default class WorldGrid {
  constructor(opts = {}) {
    this.layoutRadius = opts.layoutRadius ?? 0.5;
    this.gridSize = opts.gridSize ?? 20;
    this.elevation = opts.elevation ?? {
      base: 0.08, max: 1.35, curve: 1.35, minLand: 0.30, shorelineBlend: 0.08,
    };
    this.terrainShape = opts.terrainShape ?? {
      baseFreq: 0.07, mountainFreq: 0.16, mountainThreshold: 0.78,
      mountainStrength: 0.6, plainsExponent: 1.6, mountainExponent: 1.25, finalExponent: 1.25,
    };
    // Configurable vertical exaggeration to make mountains pop
    this.verticalExaggeration = opts.verticalExaggeration ?? {
      highland: 1.25,
      mountain: 1.75,
      peak: 2.0,
      coast: 0.98,
      ridgeBonus: 0.25, // additional up to this factor scaled by ridge (0..1)
    };
  this.seed = opts.seed ?? 1337;
  this.generationScale = opts.generationScale != null ? opts.generationScale : 1.0; // 1.0 = current scale; smaller => closer features
  this.generatorVersion = opts.generatorVersion || 'hex';
  this._generatorTuning = opts.generatorTuning || null;
  // Noise (seeded deterministically by world seed)
  // Legacy noises remain for minor shaping (e.g., shoreline), but are now tied to the same seed
  const seedStr = String(this.seed);
  this.heightNoise = new SimplexNoise('height:' + seedStr);
  this.foliageNoise = new SimplexNoise('foliage:' + seedStr);
  this.temperatureNoise = new SimplexNoise('temperature:' + seedStr);
  this.mountainNoise = new SimplexNoise('mountain:' + seedStr);
  this.waterMaskNoise = new SimplexNoise('waterMask:' + seedStr);

    // New stateless world generator (pure per-hex); we keep one instance to reuse internal noise objects
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

  getHeight(q, r) {
    const base = (this.heightNoise.noise2D(q * this.terrainShape.baseFreq, r * this.terrainShape.baseFreq) + 1) / 2;
    const plains = Math.pow(base, this.terrainShape.plainsExponent);
    const mRaw = (this.mountainNoise.noise2D(q * this.terrainShape.mountainFreq + 250, r * this.terrainShape.mountainFreq + 250) + 1) / 2;
    let mountain = 0;
    if (mRaw > this.terrainShape.mountainThreshold) {
      const norm = (mRaw - this.terrainShape.mountainThreshold) / (1 - this.terrainShape.mountainThreshold);
      mountain = Math.pow(norm, this.terrainShape.mountainExponent) * this.terrainShape.mountainStrength;
    }
    let h = plains + mountain;
    h = Math.min(1, Math.max(0, h));
    h = Math.pow(h, this.terrainShape.finalExponent);
    return h;
  }

  getCell(q, r) {
  // Fast path: serve from cache when available
  const k = this._packKey(q, r);
  const cached = this._cellCache.get(k);
  if (cached) return cached;

    const maxHeight = this.elevation.max;

    // Use new generator for macro terrain & climate
  const s = (this.generationScale && isFinite(this.generationScale) && this.generationScale > 0) ? this.generationScale : 1.0;
  const qg = q / s; const rg = r / s;
  const gen = this.hexGen.get(qg, rg);
    const hRaw = gen.fields?.h ?? 0; // 0..1 elevation composite
    // Map generator climate to our existing foliage/temp channels used by biomeColor
    const f = gen.fields?.moisture ?? 0.5; // treat moisture as foliage proxy
    const t = gen.fields?.temp ?? 0.5; // climate temperature 0..1

    // Shoreline floor and lake mask (retain subtle shaping so beaches get a lift)
    const waterMask = (this.waterMaskNoise.noise2D((q + 250) * 0.035, (r - 120) * 0.035) + 1) / 2;
    const waterCut = THREE.MathUtils.smoothstep(waterMask, 0.6, 0.85);

    const curved = Math.pow(hRaw, this.elevation.curve);
    let baseScaleY = this.elevation.base + curved * maxHeight;
    baseScaleY = baseScaleY * (1 - 0.35 * waterCut);

    const shoreTop = BIOME_THRESHOLDS.shallowWater;
    const blendRange = this.elevation.shorelineBlend;
  let yScale = baseScaleY;
    let biome = classifyBiome(hRaw);
    if (biome !== 'deepWater' && biome !== 'shallowWater') {
      if (hRaw <= shoreTop + blendRange) {
        const tt = (hRaw - shoreTop) / blendRange;
        const smoothT = tt <= 0 ? 0 : tt >= 1 ? 1 : (tt * tt * (3 - 2 * tt));
  const raised = Math.max(baseScaleY, this.elevation.minLand);
  yScale = THREE.MathUtils.lerp(baseScaleY, raised, Math.pow(smoothT, 0.9));
      } else if (baseScaleY < this.elevation.minLand) {
        const deficit = (this.elevation.minLand - baseScaleY);
        yScale = baseScaleY + deficit * 0.85;
      }
    }

    // Vertical exaggeration: make mountains pop without over-inflating coasts/water
    // Use generator elevation band and ridge strength to scale heights
    const elevBand = gen.elevationBand;
    const ridge = gen.fields?.ridge ?? 0;
    let exaggeration = 1.0;
    const exConf = this.verticalExaggeration || {};
    if (elevBand === 'Highland') {
      exaggeration = (exConf.highland ?? 1.2) + (exConf.ridgeBonus ?? 0.15) * (ridge * 0.4);
    } else if (elevBand === 'Mountain') {
      exaggeration = (exConf.mountain ?? 1.6) + (exConf.ridgeBonus ?? 0.15) * (ridge * 0.8);
    } else if (elevBand === 'Peak') {
      exaggeration = (exConf.peak ?? 1.8) + (exConf.ridgeBonus ?? 0.2) * ridge;
    } else if (elevBand === 'Coast') {
      exaggeration = (exConf.coast ?? 1.0);
    }
    // Apply exaggeration post shoreline adjustments
    yScale *= exaggeration;

    const hVisual = Math.max(0, Math.min(1, (yScale - this.elevation.base) / maxHeight));
    biome = classifyBiome(hVisual);
    const renderHints = gen.render || {};
    const colorTop = biomeColor(
      hVisual,
      f,
      t,
      this._tmpColor.clone(),
      {
        moisture: gen.fields?.moisture,
        temp: gen.fields?.temp,
        aridityTint: renderHints.aridityTint,
        snowMask: renderHints.snowMask,
        rockExposure: renderHints.rockExposure,
        bathymetryStep: renderHints.bathymetryStep,
        flags: gen.flags,
        bands: { elevation: gen.elevationBand, temp: gen.temperatureBand, moisture: gen.moistureBand },
        biomeMajor: gen.biomeMajor,
      }
    );

    // darker side color
    const side = colorTop.clone();
    const hslTmp = { h: 0, s: 0, l: 0 };
    side.getHSL(hslTmp);
    hslTmp.l = Math.min(1, hslTmp.l * 0.55 + 0.25);
    side.setHSL(hslTmp.h, hslTmp.s * 0.5, hslTmp.l);

    // Attach generator outputs for UI/debug/logic without breaking existing consumers
    const cell = {
      q, r,
      hRaw, h: hVisual,
      f, t,
      biome,
      colorTop,
      colorSide: side,
      yScale,
      gen, // full generator record (biomeMajor, biomeSub, bands, flags, render hints, fields)
    };

  // Store in cache with simple size control
  if (!this._cellCache.has(k)) this._cacheSize += 1;
  this._cellCache.set(k, cell);
    // If the cache exploded (likely grid size or center moved a lot), reset fully
    if (this._cacheSize > this._cacheLimit * 2) {
      this._cellCache.clear();
      this._cacheSize = 0;
    }
    return cell;
  }
}
