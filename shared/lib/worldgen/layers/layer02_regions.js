// shared/lib/worldgen/layers/layer02_regions.js
// Layer 2: mesoscale regions and archetype assignment

import { fbm as fbmFactory } from '../utils/noise.js';
import { makeSimplex } from '../utils/noise.js';

// Mesoscale archetypes and their canonical elevation/relief biases.
const ARCHETYPES = [
  'Megaplain',
  'Badlands',
  'HighPlateau',
  'BrokenHighlands',
  'Basins',
  'InlandRidge',
  'CoastalShelf',
];

const ARCH_BIASES = {
  Megaplain: { elevation: -0.02, relief: -0.15 },
  Badlands: { elevation: 0.02, relief: 0.45 },
  HighPlateau: { elevation: 0.12, relief: 0.25 },
  BrokenHighlands: { elevation: 0.08, relief: 0.35 },
  Basins: { elevation: -0.12, relief: -0.05 },
  InlandRidge: { elevation: 0.06, relief: 0.4 },
  CoastalShelf: { elevation: 0.01, relief: -0.02 },
};

function pickArchetype(v) {
  const idx = Math.floor(v * ARCHETYPES.length) % ARCHETYPES.length;
  return ARCHETYPES[idx];
}

function distributeBiomeWeights(base, bias) {
  // base is an object of canonical biome list -> base weight (0..1)
  // bias is archetype influence; we nudge weights toward archetype preferences.
  // For simplicity, map archetype relief/elevation into four coarse biome weights.
  const plains = Math.max(0, 0.6 - bias.relief * 0.5 - Math.abs(bias.elevation) * 0.3 + (base.plains || 0));
  const forest = Math.max(0, 0.5 - Math.abs(bias.elevation) * 0.2 + (base.forest || 0));
  const hill = Math.max(0, 0.3 + bias.relief * 0.4 + (base.hill || 0));
  const mountain = Math.max(0, 0.1 + Math.max(0, bias.elevation) * 0.6 + (base.mountain || 0));
  const sum = plains + forest + hill + mountain || 1;
  return {
    plains: plains / sum,
    forest: forest / sum,
    hill: hill / sum,
    mountain: mountain / sum,
  };
}

function computeTilePart(ctx) {
  // read layer2 config like other layers
  const cfg = (ctx.cfg && ctx.cfg.layers && ctx.cfg.layers.layer2) ? ctx.cfg.layers.layer2 : {};
  // large scale FBM to break continents into regions
  const scale = (typeof cfg.regionNoiseScale === 'number') ? cfg.regionNoiseScale : 0.02;
  const noise = makeSimplex(String(ctx.seed));
  const sampler = fbmFactory(noise, (typeof cfg.octaves === 'number' ? Math.max(1, Math.floor(cfg.octaves)) : 2), cfg.lacunarity || 2.0, cfg.gain || 0.5);
  const n = sampler(ctx.x * scale, ctx.z * scale); // -1..1
  const v = (n + 1) / 2; // 0..1

  // derive a deterministic region id using plate id + noise value
  const plateId = ctx.partials && ctx.partials.layer1 && ctx.partials.layer1.plate
    ? ctx.partials.layer1.plate.id || 0
    : 0;
  const regionId = Math.abs(Math.floor(plateId * 1000 + v * 999));
  const archetype = pickArchetype(v);

  // Archetype bias influences elevation and relief for downstream layers
  const bias = ARCH_BIASES[archetype] || { elevation: 0, relief: 0 };

  // Provide a small local jitter so neighboring tiles in the same archetype
  // aren't perfectly identical. Use a second, lower-frequency FBM sample.
  const jitterOctaves = (typeof cfg.jitterOctaves === 'number') ? Math.max(1, Math.floor(cfg.jitterOctaves)) : 1;
  const jitterGain = (typeof cfg.jitterGain === 'number') ? cfg.jitterGain : 0.5;
  const jitterLacunarity = (typeof cfg.jitterLacunarity === 'number') ? cfg.jitterLacunarity : 2.0;
  const jitter = (fbmFactory(noise, jitterOctaves, jitterLacunarity, jitterGain)(ctx.x * scale * 0.6, ctx.z * scale * 0.6) || 0) * ((typeof cfg.jitterAmplitude === 'number') ? cfg.jitterAmplitude : 0.02);

  // Compose elevation bias and relief multiplier
  const elevationBias = bias.elevation + jitter;
  const reliefMultiplier = 1 + bias.relief;

  // Compute a simple biome base prototype (coarse) and then distribute weights
  const baseBiome = {
    plains: Math.max(0, 0.6 - v * 0.3),
    forest: Math.max(0, 0.4 + (1 - Math.abs(v - 0.5)) * 0.4 - v * 0.1),
    hill: Math.max(0, 0.2 + v * 0.3),
    mountain: Math.max(0, v * 0.25),
  };

  const biomeWeights = distributeBiomeWeights(baseBiome, { elevation: elevationBias, relief: bias.relief });

  // Instead of replacing elevation, layer2 should provide a small additive
  // delta that modulates layer1. Use a local FBM at a configurable frequency
  // to produce high-quality variation. Archetype biases nudge the amplitude
  // and roughness but do not override layer1's canonical elevation.
  const areaFreq = (typeof cfg.frequency === 'number') ? cfg.frequency : 0.02;
  const areaOctaves = (typeof cfg.octaves === 'number') ? Math.max(1, Math.floor(cfg.octaves)) : 3;
  const areaGain = (typeof cfg.gain === 'number') ? cfg.gain : 0.5;
  const areaLacunarity = (typeof cfg.lacunarity === 'number') ? cfg.lacunarity : 2.0;
  const areaSampler = fbmFactory(noise, areaOctaves, areaLacunarity, areaGain);
  // sample in -1..1 and convert to -1..1 range preserved by fbmFactory
  const areaSample = areaSampler(ctx.x * areaFreq, ctx.z * areaFreq) || 0;

  // amplitude base (configurable) scaled by archetype elevation bias as a modifier
  const baseAmp = (typeof cfg.amplitude === 'number') ? cfg.amplitude : 0.02;
  // archetype elev bias shifts local amplitude slightly (not absolute height)
  const ampModifier = 1 + (bias.elevation || 0) * 0.5;
  let finalAmp = baseAmp * ampModifier;

  // Weight layer2's effect by layer1's canonical elevation so layer2
  // adds fine detail following the macro shape rather than overriding it.
  // If layer1 is unavailable, assume neutral weight (0.5).
  const baseLayer1 = (ctx && ctx.partials && ctx.partials.layer1 && ctx.partials.layer1.elevation && typeof ctx.partials.layer1.elevation.normalized === 'number')
    ? ctx.partials.layer1.elevation.normalized
    : 0.5;
  // map baseLayer1 [0..1] into a multiplier range [0.2 .. 1.0]
  const layer1Weight = 0.2 + Math.max(0, Math.min(1, baseLayer1)) * 0.8;
  finalAmp *= layer1Weight;

  // Avoid sampling symmetry at origin by adding a deterministic region jitter
  // so neighboring tiles within the same archetype still vary but we avoid
  // many tiles sampling an exact zero. Derive jitter from regionId.
  const regionJitter = ((regionId % 997) / 997) * Math.PI * 2;
  const ox = Math.cos(regionJitter) * 13.37;
  const oz = Math.sin(regionJitter) * 7.91;

  // Multi-band detail: combine areaSample with a higher-frequency band to
  // avoid frequent exact-zero outputs on symmetric coordinates.
  const highSampler = fbmFactory(noise, Math.max(1, areaOctaves - 1), areaLacunarity * 2.0, Math.max(0.3, areaGain * 0.5));
  const sampleX = (ctx.x + ox) * areaFreq;
  const sampleZ = (ctx.z + oz) * areaFreq;
  const hf = highSampler(sampleX * 2.3, sampleZ * 2.3) || 0;
  const combinedSample = (areaSample * 0.7) + (hf * 0.3);

  // final additive elevation delta (signed small value)
  const elevationContribution = combinedSample * finalAmp;

  // slope/roughness contribution: provide a multiplier hint derived from
  // archetype relief and the absolute fbm roughness (0..1)
  const roughScale = (typeof cfg.roughnessScale === 'number') ? cfg.roughnessScale : 0.5;
  const slopeContribution = Math.abs(bias.relief || 0) * roughScale + Math.abs(combinedSample) * 0.25;

  // Reduce amplitude over water so layer2 does not override shorelines or
  // produce unrealistic seafloor relief. Use layer1 bathymetry if available.
  const seaLevel = (ctx && ctx.partials && ctx.partials.layer1 && ctx.partials.layer1.bathymetry && typeof ctx.partials.layer1.bathymetry.seaLevel === 'number')
    ? ctx.partials.layer1.bathymetry.seaLevel
    : ((ctx && ctx.cfg && ctx.cfg.layers && ctx.cfg.layers.global && typeof ctx.cfg.layers.global.seaLevel === 'number') ? ctx.cfg.layers.global.seaLevel : 0.52);
  const isSea = (baseLayer1 <= seaLevel);
  const seaMultiplier = isSea ? 0.3 : 1.0;
  const elevationContributionSeaAdjusted = elevationContribution * seaMultiplier;

  return {
    region: { id: regionId, archetype },
    // elevation is additive: small raw delta; normalized is left equal to raw
  elevation: { raw: elevationContributionSeaAdjusted, normalized: elevationContributionSeaAdjusted },
  slope: slopeContribution,
    // archetypeBias remains informative for downstream layers but no longer
    // acts as absolute elevation values.
    archetypeBias: { elevation: elevationBias, reliefMultiplier },
    biomeWeights,
  };
}

export { computeTilePart };
