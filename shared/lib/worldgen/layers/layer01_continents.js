/**
 * Layer 1 – Macro geography.
 *
 * Implements the v2.1 hybrid macro pass: continents are established using a
 * low-frequency FBM mask that is warped by slow/fast flow fields, then carved
 * by plate-based Voronoi ridges and a medium-detail octave. The layer stores
 * derived values on ctx.shared so subsequent layers can reuse them without
 * additional noise reads.
 */

import { fbm as fbmFactory, domainWarp, voronoi } from '../noiseUtils.js';
import { makeSimplex } from '../noiseFactory.js';

function clamp01(v) {
  if (Number.isNaN(v)) return 0;
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

function smoothstep(t) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return t * t * (3 - 2 * t);
}

function hashToNumber(str = '') {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function ensureShared(ctx) {
  if (!ctx.shared) ctx.shared = { caches: { noise: new Map(), warps: new Map(), voronoi: new Map() }, fields: {} };
  if (!ctx.shared.caches) ctx.shared.caches = { noise: new Map(), warps: new Map(), voronoi: new Map() };
  if (!ctx.shared.caches.noise) ctx.shared.caches.noise = new Map();
  if (!ctx.shared.caches.warps) ctx.shared.caches.warps = new Map();
  if (!ctx.shared.caches.voronoi) ctx.shared.caches.voronoi = new Map();
  if (!ctx.shared.fields) ctx.shared.fields = {};
  return ctx.shared;
}

function getNamedNoise(ctx, key) {
  const shared = ensureShared(ctx);
  const cache = shared.caches.noise;
  if (cache.has(key)) return cache.get(key);
  const noise = makeSimplex(`${ctx.seed}:${key}`);
  cache.set(key, noise);
  return noise;
}

function computeWarp(ctx, key, x, z, opts) {
  const shared = ensureShared(ctx);
  const cacheKey = `${key}:${x.toFixed(6)}:${z.toFixed(6)}`;
  const cache = shared.caches.warps;
  if (cache.has(cacheKey)) return cache.get(cacheKey);
  const noise = getNamedNoise(ctx, key);
  const warped = domainWarp(noise, x, z, opts || {});
  cache.set(cacheKey, warped);
  return warped;
}

function computeVoronoi(ctx, key, cellSize) {
  const shared = ensureShared(ctx);
  const cacheKey = `${key}:${cellSize}`;
  const cache = shared.caches.voronoi;
  if (cache.has(cacheKey)) return cache.get(cacheKey);
  const seedNum = hashToNumber(`${ctx.seed}:${key}`);
  const result = voronoi(ctx.x, ctx.z, cellSize, seedNum);
  cache.set(cacheKey, result);
  return result;
}

function computeLatitude(ctx, cfg) {
  const shared = ensureShared(ctx);
  if (typeof shared.fields.latitudeNormalized === 'number') return shared.fields.latitudeNormalized;
  const latScale = (cfg && typeof cfg.latitudeScale === 'number') ? Math.max(1, cfg.latitudeScale) : 1400;
  const t = Math.tanh(ctx.z / latScale);
  const lat = clamp01(0.5 - 0.5 * t);
  shared.fields.latitudeNormalized = lat;
  return lat;
}

function computeMacroSampler(ctx, cfg) {
  const macroCfg = cfg.macro || {};
  const octaves = Math.max(1, Math.floor(macroCfg.octaves || 5));
  const lacunarity = macroCfg.lacunarity || 1.85;
  const gain = macroCfg.gain || 0.46;
  const noise = getNamedNoise(ctx, 'macro');
  return fbmFactory(noise, octaves, lacunarity, gain);
}

function computeDetailSampler(ctx, cfg) {
  const detailCfg = cfg.detail || {};
  const octaves = Math.max(1, Math.floor(detailCfg.octaves || 3));
  const lacunarity = detailCfg.lacunarity || 2.1;
  const gain = detailCfg.gain || 0.55;
  const noise = getNamedNoise(ctx, 'mediumDetail');
  return fbmFactory(noise, octaves, lacunarity, gain);
}

function computeSlopeMagnitude(sampler, x, y, detailSample) {
  const step = 0.75;
  const center = sampler(x, y);
  const sampleX = sampler(x + step, y);
  const sampleY = sampler(x, y + step);
  const dx = sampleX - center;
  const dy = sampleY - center;
  const slope = Math.sqrt(dx * dx + dy * dy);
  return clamp01(Math.abs(slope) * 1.6 + Math.abs(detailSample || 0) * 0.45);
}

function computePlateData(ctx, cfg, warpedX, warpedY) {
  const plateCfg = cfg.plates || {};
  const cellSize = Math.max(32, plateCfg.cellSize || 320);
  const vor = computeVoronoi(ctx, 'plates', cellSize);
  const distNorm = clamp01(vor.dist / (cellSize * 0.6));
  const ridgeSharpness = plateCfg.ridgeSharpness || 1.45;
  const ridgeAmp = plateCfg.ridgeAmp || 0.6;
  const ridgeNoiseFreq = plateCfg.ridgeNoiseFreq || 0.9;
  const ridgeNoiseAmp = plateCfg.ridgeNoiseAmp || 0.45;
  const ridgeNoise = getNamedNoise(ctx, 'ridge');
  const ridgeSample = ridgeNoise.noise2D(warpedX * ridgeNoiseFreq, warpedY * ridgeNoiseFreq);
  const ridgeSigned = ridgeSample * ridgeNoiseAmp;
  const ridgeBase = Math.pow(Math.max(0, 1 - distNorm), ridgeSharpness);
  const ridgeContribution = ridgeBase * ridgeSigned;
  const ridgeStrength = clamp01(ridgeBase * (0.6 + Math.abs(ridgeSigned)));
  return {
    vor,
    distNorm,
    ridgeContribution: ridgeContribution * ridgeAmp,
    ridgeStrength,
  };
}

function applyShelfClamp(value, cfg) {
  const shelf = cfg.shelfClamp || {};
  const shallowBand = typeof shelf.shallowBand === 'number' ? shelf.shallowBand : 0.28;
  const landMax = typeof shelf.landMax === 'number' ? shelf.landMax : 0.92;
  const threshold = typeof shelf.threshold === 'number' ? shelf.threshold : 0.46;
  const dampThreshold = typeof shelf.dampThreshold === 'number' ? shelf.dampThreshold : 0.22;
  const dampPower = typeof shelf.dampPower === 'number' ? shelf.dampPower : 2.8;
  const dampScale = typeof shelf.dampScale === 'number' ? shelf.dampScale : 1.0;
  let h = clamp01(value);
  if (h <= threshold) {
    if (h <= dampThreshold) {
      const t = h / Math.max(1e-6, dampThreshold);
      const atten = Math.pow(t, dampPower);
      h = atten * shallowBand * dampScale;
    } else {
      const t = (h - dampThreshold) / Math.max(1e-6, threshold - dampThreshold);
      const dampedBase = Math.pow(dampThreshold / Math.max(1e-6, dampThreshold), dampPower) * shallowBand * dampScale;
      const linearAtThreshold = shallowBand;
      h = dampedBase + t * (linearAtThreshold - dampedBase);
    }
  } else {
    const t = (h - threshold) / Math.max(1e-6, 1 - threshold);
    h = shallowBand + smoothstep(t) * (landMax - shallowBand);
  }
  return clamp01(h);
}

function computeTilePart(ctx) {
  const shared = ensureShared(ctx);
  const cfg = (ctx.cfg && ctx.cfg.layers && ctx.cfg.layers.layer1) ? ctx.cfg.layers.layer1 : {};
  const macroSampler = computeMacroSampler(ctx, cfg);
  const detailSampler = computeDetailSampler(ctx, cfg);

  const macroCfg = cfg.macro || {};
  const macroFreq = typeof macroCfg.freq === 'number' ? macroCfg.freq : 0.0028;
  const macroScale = typeof macroCfg.scale === 'number' ? macroCfg.scale : 1.0;

  const baseX = ctx.x * macroFreq * macroScale;
  const baseZ = ctx.z * macroFreq * macroScale;

  const slowCfg = cfg.warp && cfg.warp.slow ? cfg.warp.slow : {};
  const fastCfg = cfg.warp && cfg.warp.fast ? cfg.warp.fast : {};

  const slowWarp = computeWarp(ctx, 'warpSlow', baseX, baseZ, {
    freqA: typeof slowCfg.freqA === 'number' ? slowCfg.freqA : 0.05,
    ampA: typeof slowCfg.ampA === 'number' ? slowCfg.ampA : 0.35,
    freqB: typeof slowCfg.freqB === 'number' ? slowCfg.freqB : 0.32,
    ampB: typeof slowCfg.ampB === 'number' ? slowCfg.ampB : 0.08,
  });

  const fastWarp = computeWarp(ctx, 'warpFast', slowWarp.x, slowWarp.y, {
    freqA: typeof fastCfg.freqA === 'number' ? fastCfg.freqA : 0.42,
    ampA: typeof fastCfg.ampA === 'number' ? fastCfg.ampA : 0.2,
    freqB: typeof fastCfg.freqB === 'number' ? fastCfg.freqB : 1.15,
    ampB: typeof fastCfg.ampB === 'number' ? fastCfg.ampB : 0.05,
  });

  const warpedX = fastWarp.x;
  const warpedY = fastWarp.y;
  shared.caches.warps.set('slow', slowWarp);
  shared.caches.warps.set('fast', fastWarp);

  computeLatitude(ctx, cfg);

  const macroSample = macroSampler(warpedX, warpedY);
  const macro01 = clamp01((macroSample + 1) / 2);

  const detailCfg = cfg.detail || {};
  const detailFreq = typeof detailCfg.freq === 'number' ? detailCfg.freq : 0.035;
  const detailSample = detailSampler(warpedX * (detailFreq / Math.max(1e-6, macroFreq)), warpedY * (detailFreq / Math.max(1e-6, macroFreq)));
  const detailContribution = detailSample * (typeof detailCfg.amp === 'number' ? detailCfg.amp : 0.18);

  const plate = computePlateData(ctx, cfg, warpedX, warpedY);

  let blended = macro01 + detailContribution + plate.ridgeContribution;
  blended = clamp01(blended);
  blended = applyShelfClamp(blended, cfg);

  const seaLevel = (ctx.cfg && ctx.cfg.layers && ctx.cfg.layers.global && typeof ctx.cfg.layers.global.seaLevel === 'number')
    ? ctx.cfg.layers.global.seaLevel
    : 0.32;
  const oceanDepth = Math.max(0, seaLevel - blended);

  const slopeMagnitude = computeSlopeMagnitude(macroSampler, warpedX, warpedY, detailContribution);

  shared.fields.macroBase = macro01;
  shared.fields.macroElevation = blended;
  shared.fields.mediumDetailAbs = clamp01(Math.abs(detailContribution) * 2.2);
  shared.fields.detailContribution = detailContribution;
  shared.fields.plateEdgeDistance = plate.distNorm;
  shared.fields.ridgeStrength = plate.ridgeStrength;
  shared.fields.oceanDepth = oceanDepth;
  shared.fields.macroSlope = slopeMagnitude;

  const vor = plate.vor;
  const plateId = vor && vor.id ? vor.id : `plate_${hashToNumber(`${ctx.seed}:${ctx.x}:${ctx.z}`)}`;

  const isWater = blended <= seaLevel;
  const depthBand = isWater ? (blended < seaLevel - 0.14 ? 'deep' : 'shallow') : 'land';

  return {
    elevation: { raw: blended, normalized: blended },
    bathymetry: { depthBand, seaLevel },
    slope: slopeMagnitude,
    plate: {
      id: plateId,
      edgeDistance: plate.distNorm,
      ridgeStrength: plate.ridgeStrength,
    },
    macro: {
      base: macro01,
      warpedX,
      warpedY,
      detailContribution,
    },
  };
}

function fallback(ctx) {
  const shared = ensureShared(ctx);
  const cfg = (ctx.cfg && ctx.cfg.layers && ctx.cfg.layers.layer1) ? ctx.cfg.layers.layer1 : {};
  const plateSize = (cfg.plates && cfg.plates.cellSize) ? cfg.plates.cellSize : 320;
  const hash = Math.sin((ctx.x * 12.9898 + ctx.z * 78.233 + hashToNumber(ctx.seed)) % Math.PI);
  const base = clamp01((hash + 1) / 2);
  const blended = applyShelfClamp(base, cfg);
  const seaLevel = (ctx.cfg && ctx.cfg.layers && ctx.cfg.layers.global && typeof ctx.cfg.layers.global.seaLevel === 'number')
    ? ctx.cfg.layers.global.seaLevel
    : 0.32;
  const depthBand = blended <= seaLevel ? 'shallow' : 'land';
  shared.fields.macroElevation = blended;
  shared.fields.plateEdgeDistance = 0.5;
  shared.fields.macroSlope = 0.1;
  shared.fields.mediumDetailAbs = 0.1;
  const plateId = `plate_${Math.abs(Math.floor((ctx.x + ctx.z) / plateSize))}`;
  return {
    elevation: { raw: blended, normalized: blended },
    bathymetry: { depthBand, seaLevel },
    slope: 0.1,
    plate: { id: plateId, edgeDistance: 0.5, ridgeStrength: 0.2 },
    macro: { base: blended, warpedX: ctx.x, warpedY: ctx.z, detailContribution: 0 },
  };
}

export { computeTilePart, fallback };
