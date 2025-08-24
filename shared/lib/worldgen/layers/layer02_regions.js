// shared/lib/worldgen/layers/layer02_regions.js
// Layer 2: mesoscale regions and archetype assignment (stub)

import { fbm } from '../noiseUtils.js';

const ARCHETYPES = ['Megaplain','Badlands','HighPlateau','BrokenHighlands','Basins','InlandRidge','CoastalShelf'];

function pickArchetype(ctx, v) {
  const idx = Math.floor(v * ARCHETYPES.length) % ARCHETYPES.length;
  return ARCHETYPES[idx];
}

function computeTilePart(ctx) {
  const scale = ctx.cfg.layers.layer2.regionNoiseScale || 0.02;
  const v = fbm(ctx, ctx.x * scale, ctx.z * scale, 3);
  const regionId = Math.abs(Math.floor((ctx.x * 31 + ctx.z * 17 + Math.floor(v * 1000))));
  const archetype = pickArchetype(ctx, v);
  return { region: { id: regionId, archetype } };
}

export { computeTilePart };
