// shared/lib/worldgen/layers/layer02_regions.js
// Layer 2: mesoscale archetype assignment and regional adjustments.
// Consumes layer1 macro fields and emits archetype metadata, small elevation
// deltas, and relief/climate biases for downstream layers.

import { fbm as fbmFactory } from '../noiseUtils.js';
import { makeSimplex } from '../noiseFactory.js';

function clamp01(v) {
  if (Number.isNaN(v)) return 0;
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

function ensureShared(ctx) {
  if (!ctx.shared) ctx.shared = { caches: { noise: new Map() }, fields: {} };
  if (!ctx.shared.caches) ctx.shared.caches = { noise: new Map() };
  if (!ctx.shared.caches.noise) ctx.shared.caches.noise = new Map();
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

function hashToNumber(str = '') {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  return h >>> 0;
}

function pickArchetype(cfg, value) {
  if (!cfg || !Array.isArray(cfg.archetypes) || cfg.archetypes.length === 0) {
    return { id: 'Generic', elevationOffset: 0, reliefWeight: 1, reliefBias: 0, temperatureBias: 0, moistureBias: 0 };
  }
  const list = cfg.archetypes;
  const idx = Math.floor(value * list.length) % list.length;
  return list[idx];
}

function computeBiomeWeights(archetype) {
  const elev = archetype.elevationOffset || 0;
  const reliefWeight = archetype.reliefWeight || 1;
  const reliefBias = archetype.reliefBias || 0;
  const moistureBias = archetype.moistureBias || 0;
  const plains = clamp01(0.6 - Math.max(0, reliefWeight - 1) * 0.25 - Math.abs(elev) * 0.4);
  const forest = clamp01(0.4 + moistureBias * 0.5 - Math.abs(elev) * 0.2);
  const hill = clamp01(0.3 + Math.max(0, reliefWeight - 1) * 0.35 + reliefBias * 0.25);
  const mountain = clamp01(Math.max(0, elev) * 1.1 + Math.max(0, reliefBias) * 0.6);
  const desert = clamp01(0.2 - moistureBias * 0.5 + Math.max(0, elev) * 0.2);
  const sum = plains + forest + hill + mountain + desert || 1;
  return {
    plains: plains / sum,
    forest: forest / sum,
    hill: hill / sum,
    mountain: mountain / sum,
    desert: desert / sum,
  };
}

function computeTilePart(ctx) {
  const shared = ensureShared(ctx);
  const cfg = (ctx.cfg && ctx.cfg.layers && ctx.cfg.layers.layer2) ? ctx.cfg.layers.layer2 : {};
  const breakupCfg = cfg.breakup || {};
  const freq = typeof breakupCfg.freq === 'number' ? breakupCfg.freq : 0.014;
  const octaves = Math.max(1, Math.floor(breakupCfg.octaves || 2));
  const lacunarity = breakupCfg.lacunarity || 1.9;
  const gain = breakupCfg.gain || 0.6;
  const noise = getNamedNoise(ctx, 'regionBreakup');
  const sampler = fbmFactory(noise, octaves, lacunarity, gain);

  let sampleX = ctx.x * freq;
  let sampleZ = ctx.z * freq;
  if (cfg.regionWarp && typeof cfg.regionWarp.amp === 'number') {
    const warpAmp = cfg.regionWarp.amp;
    const warpFreq = cfg.regionWarp.freq || 0.08;
    sampleX += Math.sin(ctx.x * warpFreq + ctx.z * 0.3) * warpAmp;
    sampleZ += Math.cos(ctx.z * warpFreq + ctx.x * 0.5) * warpAmp;
  }

  const breakup = sampler(sampleX, sampleZ);
  const v = clamp01((breakup + 1) / 2);

  const archetype = pickArchetype(cfg, v);
  const reliefWeight = typeof archetype.reliefWeight === 'number' ? archetype.reliefWeight : 1;
  const reliefBias = typeof archetype.reliefBias === 'number' ? archetype.reliefBias : 0;
  const elevationOffset = typeof archetype.elevationOffset === 'number' ? archetype.elevationOffset : 0;
  const tempBias = typeof archetype.temperatureBias === 'number' ? archetype.temperatureBias : 0;
  const moistureBias = typeof archetype.moistureBias === 'number' ? archetype.moistureBias : 0;

  const plateId = (ctx.partials && ctx.partials.layer1 && ctx.partials.layer1.plate && ctx.partials.layer1.plate.id)
    ? ctx.partials.layer1.plate.id
    : 'plate0';
  const regionId = hashToNumber(`${plateId}:${Math.floor(v * 4096)}`);

  const localDetailNoise = getNamedNoise(ctx, 'regionLocal');
  const localSampler = fbmFactory(localDetailNoise, 2, 2.2, 0.55);
  const localFreq = typeof breakupCfg.localFreq === 'number' ? breakupCfg.localFreq : 0.09;
  const detailSample = localSampler(ctx.x * localFreq, ctx.z * localFreq);
  const amplitude = (typeof breakupCfg.amplitude === 'number' ? breakupCfg.amplitude : 0.04) * (1 + Math.abs(elevationOffset) * 0.6);

  const baseElevation = (ctx.shared && ctx.shared.fields && typeof ctx.shared.fields.macroElevation === 'number')
    ? ctx.shared.fields.macroElevation
    : (ctx.partials && ctx.partials.layer1 && ctx.partials.layer1.elevation && typeof ctx.partials.layer1.elevation.normalized === 'number'
      ? ctx.partials.layer1.elevation.normalized
      : 0.5);
  const seaLevel = (ctx.cfg && ctx.cfg.layers && ctx.cfg.layers.global && typeof ctx.cfg.layers.global.seaLevel === 'number')
    ? ctx.cfg.layers.global.seaLevel
    : 0.32;
  const seaMultiplier = baseElevation <= seaLevel ? 0.3 : 1;

  const elevationDelta = (detailSample * amplitude + elevationOffset * 0.35) * seaMultiplier;
  const slopeContribution = clamp01(Math.abs(detailSample) * 0.35 + Math.max(0, reliefBias) * 0.35);

  shared.region = {
    id: regionId,
    archetype: archetype.id || 'Generic',
    reliefWeight,
    reliefBias,
    elevationOffset,
    temperatureBias: tempBias,
    moistureBias,
  };
  shared.fields.regionElevationDelta = elevationDelta;

  const biomeWeights = computeBiomeWeights(archetype);

  return {
    region: { id: regionId, archetype: archetype.id || 'Generic' },
    elevation: { raw: elevationDelta, normalized: elevationDelta },
    slope: slopeContribution,
    archetypeBias: { elevation: elevationOffset, reliefMultiplier: reliefWeight },
    biomeWeights,
  };
}

export { computeTilePart };
