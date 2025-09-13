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
  let h = (ctx.partials && ctx.partials.layer1 && ctx.partials.layer1.elevation)
    ? ctx.partials.layer1.elevation.normalized
    : (baseSampler(ctx.x * 0.01, ctx.z * 0.01) + 1) / 2;

  // If layer2 provided archetype bias, apply minor elevation bias so mesoscale affects biome bands
  if (ctx.partials && ctx.partials.layer2 && ctx.partials.layer2.archetypeBias) {
    const ab = ctx.partials.layer2.archetypeBias;
    if (typeof ab.elevation === 'number') h = Math.max(0, Math.min(1, h + ab.elevation));
  }
  const major = chooseMajor(h);

  // secondary candidate and blend factor
  // Use secondary sampler but bias choices according to layer2 biomeWeights when available
  let secIdx = Math.floor((secSampler(ctx.x * 0.03, ctx.z * 0.03) + 1) / 2 * MAJOR.length) % MAJOR.length;
  // Map coarse biomeWeights (plains, forest, hill, mountain) into MAJOR indices bias
  if (ctx.partials && ctx.partials.layer2 && ctx.partials.layer2.biomeWeights) {
    const bw = ctx.partials.layer2.biomeWeights;
    // create a small preference map over MAJOR indices
    const prefs = MAJOR.map((m) => {
      if (m === 'plains') return bw.plains || 0;
      if (m === 'forest') return bw.forest || 0;
      if (m === 'hill') return bw.hill || 0;
      if (m === 'mountain' || m === 'snow') return bw.mountain || 0.1;
      return 0.1; // beach/ocean baseline
    });
    // convert secSampler to probabilistic index with bias
    const rnd = (secSampler(ctx.x * 0.03, ctx.z * 0.03) + 1) / 2;
    const total = prefs.reduce((s, v) => s + v, 0) || 1;
    let acc = 0;
    let chosen = 0;
    for (let i = 0; i < prefs.length; i++) {
      acc += (prefs[i] / total);
      if (rnd <= acc) { chosen = i; break; }
    }
    secIdx = chosen;
  }
  const secondary = MAJOR[secIdx];
  const blend = Math.abs(valueNoise(ctx, ctx.x * 0.07, ctx.z * 0.07) - 0.5) * 2 * 0.5; // 0..0.5

  return { biome: { major, secondary, blend } };
}

export { computeTilePart };
