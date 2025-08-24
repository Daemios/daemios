// shared/lib/worldgen/layers/layer02_regions.js
// Layer 2: mesoscale regions and archetype assignment (stub)

import { fbm } from '../noiseUtils.js';
import { makeSimplex } from '../noiseFactory.js';

const ARCHETYPES = ['Megaplain','Badlands','HighPlateau','BrokenHighlands','Basins','InlandRidge','CoastalShelf'];

function pickArchetype(ctx, v) {
  const idx = Math.floor(v * ARCHETYPES.length) % ARCHETYPES.length;
  return ARCHETYPES[idx];
}

function computeTilePart(ctx) {
  const scale = ctx.cfg.layers.layer2.regionNoiseScale || 0.02;
  // sample FBM noise in world-space using the world seed for continuity
  const noise = makeSimplex(String(ctx.seed));
  const sampler = fbm(noise, 3, 2.0, 0.5);
  const v = (sampler(ctx.x * scale, ctx.z * scale) + 1) / 2; // normalize to 0..1
  const regionId = Math.abs(Math.floor((ctx.x * 31 + ctx.z * 17 + Math.floor(v * 1000))));
  const archetype = pickArchetype(ctx, v);
  return { region: { id: regionId, archetype } };
}

export { computeTilePart };
