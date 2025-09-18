// shared/lib/worldgen/layers/layer03_biomes.js
// Layer 3: biome selection and micro-relief decoration.
// Evaluates biome probability curves using macro elevation, climate, and relief
// derived fields, then applies biome-specific micro variation.

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

function evaluateCurve(curve, value) {
  if (!Array.isArray(curve) || curve.length === 0) return 1;
  const pts = curve.slice().sort((a, b) => (a.x ?? 0) - (b.x ?? 0));
  const v = clamp01(value);
  if (v <= pts[0].x) return pts[0].w ?? 1;
  if (v >= pts[pts.length - 1].x) return pts[pts.length - 1].w ?? 1;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    if (v >= a.x && v <= b.x) {
      const t = (v - a.x) / Math.max(1e-6, b.x - a.x);
      const wa = a.w ?? 1;
      const wb = b.w ?? 1;
      return wa + t * (wb - wa);
    }
  }
  return 1;
}

function resolveElevationBand(cfg, elev) {
  const bands = (cfg && cfg.elevationBands) || {};
  const value = clamp01(elev);
  if (value < (bands.deepOcean ?? 0.12)) return 'deepOcean';
  if (value < (bands.abyss ?? 0.2)) return 'abyss';
  if (value < (bands.shelf ?? 0.3)) return 'shelf';
  if (value < (bands.coast ?? 0.36)) return 'coast';
  if (value < (bands.lowland ?? 0.52)) return 'lowland';
  if (value < (bands.highland ?? 0.68)) return 'highland';
  if (value < (bands.mountain ?? 0.82)) return 'mountain';
  if (value < (bands.peak ?? 0.92)) return 'peak';
  return 'peak';
}

function mapRegionWeights(regionWeights, biomeName) {
  if (!regionWeights) return 1;
  if (!biomeName) return 1;
  const rw = regionWeights;
  if (biomeName === 'Grassland') return 0.6 + (rw.plains || 0.4);
  if (biomeName === 'Forest' || biomeName === 'Wetland') return 0.6 + (rw.forest || 0.4);
  if (biomeName === 'Highland' || biomeName === 'Alpine' || biomeName === 'Tundra' || biomeName === 'Glacier') return 0.5 + (rw.mountain || 0.3);
  if (biomeName === 'Desert') return 0.5 + (rw.desert || 0.2);
  if (biomeName === 'Coast') return 0.6 + (rw.plains || 0.3);
  return 1;
}

function computeBiomeScore(name, biomeCfg, ctx, elevationNorm, climate, reliefIndex, regionWeights) {
  const baseWeight = typeof biomeCfg.baseWeight === 'number' ? Math.max(0, biomeCfg.baseWeight) : 1;
  const band = resolveElevationBand(ctx.cfg.layers.layer3, elevationNorm);
  const bandWeight = biomeCfg.elevationBands && typeof biomeCfg.elevationBands[band] === 'number'
    ? biomeCfg.elevationBands[band]
    : 1;
  const tempWeight = evaluateCurve(biomeCfg.temperatureCurve, climate.temperature);
  const moistureWeight = evaluateCurve(biomeCfg.moistureCurve, climate.moisture);
  const reliefWeight = evaluateCurve(biomeCfg.reliefCurve, reliefIndex);
  const regionWeight = mapRegionWeights(regionWeights, name);
  return Math.max(0, baseWeight * bandWeight * tempWeight * moistureWeight * reliefWeight * regionWeight);
}

function computeMicroRelief(ctx, biomeKey, microCfg, reliefIndex) {
  if (!microCfg) return { delta: 0, roughness: clamp01(reliefIndex) };
  const amplitude = typeof microCfg.amp === 'number' ? microCfg.amp : 0.08;
  const frequency = typeof microCfg.frequency === 'number' ? microCfg.frequency : 1.8;
  const octaves = Math.max(1, Math.floor(microCfg.octaves || 2));
  const lacunarity = microCfg.lacunarity || 2.2;
  const gain = microCfg.gain || 0.55;
  const reliefScale = typeof microCfg.reliefScale === 'number' ? microCfg.reliefScale : 1;
  const slopeBias = typeof microCfg.slopeBias === 'number' ? microCfg.slopeBias : 0;
  const noise = getNamedNoise(ctx, `biome:${biomeKey}`);
  const sampler = fbmFactory(noise, octaves, lacunarity, gain);
  const sample = sampler(ctx.x * frequency, ctx.z * frequency);
  const scaledRelief = Math.pow(clamp01(reliefIndex), microCfg.reliefExponent ? Math.max(0.2, microCfg.reliefExponent) : 1);
  const delta = sample * amplitude * scaledRelief * reliefScale + slopeBias * scaledRelief;
  const roughness = clamp01(Math.abs(sample) * 0.5 + scaledRelief * 0.6);
  return { delta, roughness };
}

function computeTilePart(ctx) {
  const shared = ensureShared(ctx);
  const cfg = (ctx.cfg && ctx.cfg.layers && ctx.cfg.layers.layer3) ? ctx.cfg.layers.layer3 : {};
  const biomes = cfg.biomes || {};
  const climate = (ctx.shared && ctx.shared.climate) || { temperature: 0.5, moisture: 0.5 };
  const reliefIndex = (typeof ctx.shared?.reliefIndex === 'number') ? ctx.shared.reliefIndex : 0.5;
  const baseElevation = (ctx.shared && ctx.shared.fields && typeof ctx.shared.fields.macroElevation === 'number')
    ? ctx.shared.fields.macroElevation
    : (ctx.partials && ctx.partials.layer1 && ctx.partials.layer1.elevation && typeof ctx.partials.layer1.elevation.normalized === 'number'
      ? ctx.partials.layer1.elevation.normalized
      : 0.5);
  const regionWeights = ctx.partials && ctx.partials.layer2 ? ctx.partials.layer2.biomeWeights : null;

  let best = { name: 'Grassland', score: 0.01 };
  let runner = { name: 'Forest', score: 0.01 };
  const weights = {};

  for (const [name, biomeCfg] of Object.entries(biomes)) {
    const score = computeBiomeScore(name, biomeCfg, ctx, baseElevation, climate, reliefIndex, regionWeights);
    weights[name] = score;
    if (score >= best.score) {
      runner = best;
      best = { name, score };
    } else if (score > runner.score) {
      runner = { name, score };
    }
  }

  if (!biomes[best.name]) {
    best = { name: 'Grassland', score: 1 };
  }
  if (!biomes[runner.name]) {
    runner = { name: best.name === 'Forest' ? 'Grassland' : 'Forest', score: Math.max(0.01, best.score * 0.5) };
  }

  const ecotoneRatio = best.score > 0 ? clamp01((runner.score || 0) / (best.score + 1e-6)) : 0;
  const blendBase = clamp01(ecotoneRatio * (cfg.ecotoneThreshold || 0.24));

  const microCfg = biomes[best.name] ? biomes[best.name].microRelief : null;
  const micro = computeMicroRelief(ctx, best.name, microCfg, reliefIndex);

  shared.biome = { major: best.name, secondary: runner.name, blend: blendBase };
  shared.fields.microReliefDelta = micro.delta;
  shared.fields.microReliefRoughness = micro.roughness;

  return {
    biome: {
      major: best.name,
      secondary: runner.name,
      blend: blendBase,
      weights,
    },
    climate,
    reliefIndex,
    elevation: { raw: micro.delta, normalized: micro.delta },
    slope: clamp01((ctx.shared?.fields?.macroSlope || 0) * 0.6 + micro.roughness * 0.4),
  };
}

export { computeTilePart };
