// shared/lib/worldgen/layers/layer01_continents.js
// Layer 1: continents & mesoscale — mirror client's height pipeline using a
// seeded Simplex FBM and domain warp for parity.

import { fbm as fbmFactory, domainWarp } from '../noiseUtils.js';
import { makeSimplex } from '../noiseFactory.js';

// Re-implement the client's continentalMask logic here to improve parity.
function continentalMask(noise, q, r, scale = 48, cfg = {}) {
  const x = q / scale;
  const y = r / scale;

  const warpCfg = cfg.domainWarp || { ampA: 0.8, freqA: 0.3, ampB: 0.25, freqB: 2.0 };
  const warped = domainWarp(noise, x, y, warpCfg);

  const fbmCfg = cfg.fbm || { octaves: 5, lacunarity: 2.0, gain: 0.5 };
  const macroOctaves = Math.max(3, (fbmCfg.octaves || 5) - 1);
  const macroSampler = fbmFactory(noise, macroOctaves, fbmCfg.lacunarity || 2.0, fbmCfg.gain || 0.5);

  const v = macroSampler(warped.x, warped.y); // -1..1
  const base = (v + 1) / 2; // 0..1

  const seaLevel = typeof cfg.seaLevel === 'number' ? cfg.seaLevel : 0.52;
  const shallowBand = 0.26;

  let h;
  if (base < seaLevel) {
    h = (base / seaLevel) * shallowBand;
  } else {
    h = shallowBand + ((base - seaLevel) / (1 - seaLevel)) * (1 - shallowBand);
  }
  if (h < 0) h = 0;
  if (h > 1) h = 1;
  return h;
}

function computeTilePart(ctx) {
  const q = ctx.q;
  const r = ctx.r;
  const cfg = ctx.cfg.layers.layer1 || {};
  const scale = cfg.scale || 12.0;
  const heightMult = typeof cfg.heightMult === 'number' ? cfg.heightMult : 1.0;

  const noise = makeSimplex(ctx.seed, q, r);
  const fbmSampler = fbmFactory(noise, cfg.fbmOctaves || 4, cfg.lacunarity || 2.0, cfg.gain || 0.5);

  // Macro continental mask using client-like algorithm
  const macro = continentalMask(noise, q, r, cfg.plateCellSize || 48, cfg);

  // Mesoscale detail using domain warp and FBM
  const x = q / scale;
  const y = r / scale;
  const warp = domainWarp(noise, x, y, cfg.domainWarp || {});
  const v = fbmSampler(warp.x, warp.y); // -1..1
  const detail = (v + 1) / 2;

  const detailWeight = 0.35;
  const combined = Math.max(0, Math.min(1, macro * (1 - detailWeight) + detail * detailWeight));
  const h = combined * heightMult;

  const seaLevel = typeof cfg.seaLevel === 'number' ? cfg.seaLevel : 0.52;
  const isWater = h <= seaLevel;
  const depthBand = isWater ? (h < seaLevel - 0.15 ? 'deep' : 'shallow') : 'land';

  const plateSize = cfg.plateCellSize || 48;
  const plateId = Math.abs(Math.floor((q + r) / plateSize));
  const edgeDistance = Math.abs((q + r) % plateSize - (plateSize / 2)) / plateSize;

  return {
    elevation: { raw: h, normalized: h },
    bathymetry: { depthBand, seaLevel },
    slope: 0.0,
    plate: { id: plateId, edgeDistance }
  };
}

function fallback(ctx) {
  const v = Math.abs(Math.sin((ctx.q * 12.9898 + ctx.r * 78.233) % 1));
  const cfg = ctx.cfg.layers.layer1 || {};
  const seaLevel = typeof cfg.seaLevel === 'number' ? cfg.seaLevel : 0.52;
  const isWater = v <= seaLevel;
  const depthBand = isWater ? (v < seaLevel - 0.15 ? 'deep' : 'shallow') : 'land';
  return { elevation: { raw: v, normalized: v }, bathymetry: { depthBand, seaLevel }, slope: 0.0 };
}

export { computeTilePart, fallback };
