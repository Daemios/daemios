// shared/lib/worldgen/layers/layer03_biomes.js
// Layer 3: biome attributes (data-only)
// This layer must not include any direct visual assignments. Instead it
// returns semantic attributes that the palette interpreter will convert into
// concrete colors later in the merge step.

import { fbm as fbmFactory, valueNoise } from '../utils/noise.js';
import { makeSimplex } from '../noiseFactory.js';

// Major biome candidates used for semantic classification. Keep this list
// intentionally small; downstream palette interpreter will map these to
// visual palettes or to richer biome definitions.
const MAJOR = ['ocean','beach','plains','forest','hill','mountain','snow'];

function chooseMajor(h, seaLevel) {
  // Use the authoritative seaLevel when available; fall back to sensible defaults
  const sl = (typeof seaLevel === 'number') ? seaLevel : 0.33;
  // beach band is narrow: just above seaLevel up to +0.05
  const beachMax = sl + 0.05;
  if (h < sl) return 'ocean';
  if (h < beachMax) return 'beach';
  if (h < 0.55) return 'plains';
  if (h < 0.72) return 'forest';
  if (h < 0.88) return 'hill';
  return 'mountain';
}

function computeTilePart(ctx) {
  // deterministic noise sources for local variety
  const noise = makeSimplex(String(ctx.seed));
  const baseSampler = fbmFactory(noise, 3, 2.0, 0.5);
  const secSampler = fbmFactory(noise, 2, 2.2, 0.55);

  // elevation used only to decide biome bands; prefer layer1 normalized if present
  let h = (ctx.partials && ctx.partials.layer1 && ctx.partials.layer1.elevation)
    ? ctx.partials.layer1.elevation.normalized
    : (baseSampler(ctx.x * 0.01, ctx.z * 0.01) + 1) / 2;

  // Do NOT mutate elevation here. Instead return an archetypeBias object
  // describing semantic nudges (small numbers) that the palette interpreter
  // may use when resolving final palette. Keep bias values tiny.
  const archetypeBias = {};
  if (ctx.partials && ctx.partials.layer2 && ctx.partials.layer2.archetypeBias) {
    // propagate the layer2 archetypeBias through so downstream systems can use it
    archetypeBias.elevation = ctx.partials.layer2.archetypeBias.elevation;
  }

  // Determine authoritative seaLevel from layer1/bathymetry or from cfg
  const seaLevel = (ctx.partials && ctx.partials.layer1 && ctx.partials.layer1.bathymetry && typeof ctx.partials.layer1.bathymetry.seaLevel === 'number')
    ? ctx.partials.layer1.bathymetry.seaLevel
    : (ctx && ctx.cfg && ctx.cfg.layers && ctx.cfg.layers.global && typeof ctx.cfg.layers.global.seaLevel === 'number')
      ? ctx.cfg.layers.global.seaLevel
      : 0.33;
  const major = chooseMajor(h, seaLevel);

  // Determine a secondary candidate using a second noise sampler and
  // optional bias from layer2 biomeWeights. We return biomeWeights so the
  // interpreter can make richer decisions (transitions, blending, rarity).
  let secIdx = Math.floor((secSampler(ctx.x * 0.03, ctx.z * 0.03) + 1) / 2 * MAJOR.length) % MAJOR.length;
  let biomeWeights = null;
  if (ctx.partials && ctx.partials.layer2 && ctx.partials.layer2.biomeWeights) {
    biomeWeights = Object.assign({}, ctx.partials.layer2.biomeWeights);
    // bias the secondary index probabilistically using the weights but do
    // not modify any visual outputs here.
    const bw = biomeWeights;
    const prefs = MAJOR.map((m) => {
      if (m === 'plains') return bw.plains || 0;
      if (m === 'forest') return bw.forest || 0;
      if (m === 'hill') return bw.hill || 0;
      if (m === 'mountain' || m === 'snow') return bw.mountain || 0.1;
      return 0.1; // beach/ocean baseline
    });
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

  // Return only semantic data. No colors, no yScale, no visual hints here.
  return { biome: { major, secondary, blend }, archetypeBias, biomeWeights };
}

export { computeTilePart };
