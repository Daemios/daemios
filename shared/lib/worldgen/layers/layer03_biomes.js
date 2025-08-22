// shared/lib/worldgen/layers/layer03_biomes.js
// Layer 3: biome selection & blending (stub)

import { fbm, valueNoise } from '../noiseUtils.js';

const MAJOR = ['ocean','beach','plains','forest','hill','mountain','snow'];

function chooseMajor(ctx, h) {
  // simple mapping based on normalized elevation
  if (h < 0.28) return 'ocean';
  if (h < 0.35) return 'beach';
  if (h < 0.55) return 'plains';
  if (h < 0.72) return 'forest';
  if (h < 0.88) return 'hill';
  return 'mountain';
}

function computeTilePart(ctx) {
  const h = (ctx.partials && ctx.partials.layer1 && ctx.partials.layer1.elevation) ? ctx.partials.layer1.elevation.normalized : fbm(ctx, ctx.q * 0.01, ctx.r * 0.01, 3);
  const major = chooseMajor(ctx, h);
  // pick a secondary candidate with a small noise weight for blending
  const secIdx = Math.floor(fbm(ctx, ctx.q * 0.03, ctx.r * 0.03, 2) * MAJOR.length) % MAJOR.length;
  const secondary = MAJOR[secIdx];
  const blend = Math.abs(valueNoise(ctx, ctx.q * 0.07, ctx.r * 0.07) - 0.5) * 2 * 0.5; // 0..0.5
  return { biome: { major, secondary, blend } };
}

export { computeTilePart };
