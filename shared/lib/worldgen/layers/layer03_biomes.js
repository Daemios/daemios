// shared/lib/worldgen/layers/layer03_biomes.js
// Layer 3: biome selection & blending

import { fbm as fbmFactory, valueNoise } from '../noiseUtils.js';
import { makeSimplex } from '../noiseFactory.js';

const MAJOR = ['ocean','beach','plains','forest','hill','mountain','snow'];

function chooseMajor(h) {
  // simple mapping based on normalized elevation
  if (h < 0.28) return 'ocean';
  if (h < 0.35) return 'beach';
  if (h < 0.55) return 'plains';
  if (h < 0.72) return 'forest';
  if (h < 0.88) return 'hill';
  return 'mountain';
}

function computeTilePart(ctx) {
  const noise = makeSimplex(String(ctx.seed));
  const baseSampler = fbmFactory(noise, 3, 2.0, 0.5);
  const secSampler = fbmFactory(noise, 2, 2.2, 0.55);

  // elevation from layer1 or fallback noise
  const h = (ctx.partials && ctx.partials.layer1 && ctx.partials.layer1.elevation)
    ? ctx.partials.layer1.elevation.normalized
    : (baseSampler(ctx.x * 0.01, ctx.z * 0.01) + 1) / 2;
  const major = chooseMajor(h);

  // secondary candidate and blend factor
  const secIdx = Math.floor((secSampler(ctx.x * 0.03, ctx.z * 0.03) + 1) / 2 * MAJOR.length) % MAJOR.length;
  const secondary = MAJOR[secIdx];
  const blend = Math.abs(valueNoise(ctx, ctx.x * 0.07, ctx.z * 0.07) - 0.5) * 2 * 0.5; // 0..0.5

  return { biome: { major, secondary, blend } };
}

export { computeTilePart };
