// shared/lib/worldgen/layers/layer02_regions.js
// Layer 2: mesoscale regions and archetype assignment

import { fbm as fbmFactory } from '../noiseUtils.js';
import { makeSimplex } from '../noiseFactory.js';

const ARCHETYPES = [
  'Megaplain',
  'Badlands',
  'HighPlateau',
  'BrokenHighlands',
  'Basins',
  'InlandRidge',
  'CoastalShelf',
];

function pickArchetype(v) {
  const idx = Math.floor(v * ARCHETYPES.length) % ARCHETYPES.length;
  return ARCHETYPES[idx];
}

function computeTilePart(ctx) {
  // large scale FBM to break continents into regions
  const scale = ctx.cfg.layers.layer2.regionNoiseScale || 0.02;
  const noise = makeSimplex(String(ctx.seed));
  const sampler = fbmFactory(noise, 2, 2.0, 0.5);
  const n = sampler(ctx.x * scale, ctx.z * scale); // -1..1
  const v = (n + 1) / 2; // 0..1

  // derive a deterministic region id using plate id + noise value
  const plateId = ctx.partials && ctx.partials.layer1 && ctx.partials.layer1.plate
    ? ctx.partials.layer1.plate.id || 0
    : 0;
  const regionId = Math.abs(
    Math.floor(plateId * 1000 + v * 999)
  );
  const archetype = pickArchetype(v);
  return { region: { id: regionId, archetype } };
}

export { computeTilePart };
