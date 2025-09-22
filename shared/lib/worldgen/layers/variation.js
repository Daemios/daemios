/**
 * Variation layer — subtle low-power noise to increase terrain variety.
 * Purpose: provide a small additive contribution to elevation that breaks
 * up overly-smooth areas without changing macro shapes created by continents
 * or mountains. This layer should be conservative (low amplitude) and
 * complementary to other layers.
 */
import { fbm as fbmFactory, domainWarp, voronoi } from '../utils/noise.js';
import { makeSimplex } from '../utils/noise.js';

function computeTilePart(ctx) {
  const cfg = (ctx && ctx.cfg && ctx.cfg.layers && ctx.cfg.layers.variation) ? ctx.cfg.layers.variation : {};
  const amp = (typeof cfg.variationAmplitude === 'number') ? cfg.variationAmplitude : 0.02;
  const macroCfg = cfg.macro || { octaves: 3, lacunarity: 2.0, gain: 0.6, freq: 0.001 };
  const hfCfg = cfg.hf || { octaves: 4, lacunarity: 2.0, gain: 0.5, freq: 0.01 };
  const warpCfg = cfg.warp || { ampA: 0.6, freqA: 0.12, ampB: 0.12, freqB: 1.0 };
  const maskBias = typeof cfg.maskBias === 'number' ? cfg.maskBias : 0.65;
  const maskFalloff = typeof cfg.maskFalloff === 'number' ? cfg.maskFalloff : 0.25;

  const seed = String(ctx && ctx.seed ? ctx.seed : '0');
  const noise = makeSimplex(seed);

  // Macro mask: low-frequency fbm to detect large coherent features
  const macroSampler = fbmFactory(noise, macroCfg.octaves, macroCfg.lacunarity, macroCfg.gain);
  const macroRaw = macroSampler(ctx.x * macroCfg.freq, ctx.z * macroCfg.freq); // -1..1
  const macro = Math.max(0, Math.min(1, (macroRaw + 1) / 2)); // 0..1

  // Domain-warp coordinates for high-frequency sampling
  const warped = domainWarp(noise, ctx.x * hfCfg.freq, ctx.z * hfCfg.freq, warpCfg);
  const hfSampler = fbmFactory(noise, hfCfg.octaves, hfCfg.lacunarity, hfCfg.gain);
  let hf = hfSampler(warped.x, warped.y); // -1..1
  hf = Math.max(-1, Math.min(1, hf));

  // Remap hf to bi-directional small bumps and compute mask factor so that
  // micro-noise is suppressed where macro mask is high (so we don't emphasize
  // the same large shapes)
  const hfNorm = hf; // -1..1
  const tRaw = Math.max(0, Math.min(1, (macro - maskBias) / maskFalloff));
  const maskFactor = 1 - tRaw; // 1 where macro low, 0 where macro high

  // Optional slope-based attenuation
  const slope = (ctx.partials && ctx.partials.continents && typeof ctx.partials.continents.slope === 'number') ? ctx.partials.continents.slope : 0;
  const slopeFactor = 1 - Math.min(1, slope * 1.5);

  const contribution = hfNorm * maskFactor * slopeFactor * amp;

  // Provide microvariation magnitude to allow palette/clutter to react without
  // exposing large elevation changes if desired.
  const out = { elevation: { raw: contribution, normalized: contribution }, microvariation: Math.abs(contribution) };

  // Optional debug fields for sampling tools
  if (cfg.debug) out._debug = { macro, hf: hfNorm, maskFactor, slope };

  return out;
}

export { computeTilePart };
