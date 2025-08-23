// shared/lib/worldgen/layers/layer01_continents.js
// Layer 1: continents & mesoscale — mirror client's height pipeline using a
// seeded Simplex FBM and domain warp for parity.

import { fbm as fbmFactory, domainWarp, voronoi } from '../noiseUtils.js';
import { makeSimplex } from '../noiseFactory.js';
import { axialToXZ as axialToXZShared } from '../layout.js';
import { isInsideAxialSquare, isInsideWorldSquare } from '../debugPatterns.js';

// Re-implement the client's continentalMask logic here to improve parity.
function continentalMask(noise, q, r, scale = 180, cfg = {}) {
  // Use a much larger default scale to favour continent-sized features.
  const x = q / scale;
  const y = r / scale;

  // Gentle, ultra-low-frequency warp to bend continents without adding high-frequency detail
  const warpCfg = cfg.domainWarpMacro || cfg.domainWarp || { ampA: 0.6, freqA: 0.06, ampB: 0.18, freqB: 0.3 };
  const warped = domainWarp(noise, x, y, warpCfg);

  // Macro FBM should be low-octave to create broad landmasses
  // Macro FBM: increase octaves and gain to create stronger, lower-frequency variation
  const fbmCfg = cfg.fbmMacro || cfg.fbm || { octaves: 5, lacunarity: 1.9, gain: 0.6 };
  const macroOctaves = Math.max(3, (fbmCfg.octaves || 5));
  const macroSampler = fbmFactory(noise, macroOctaves, fbmCfg.lacunarity || 1.9, fbmCfg.gain || 0.6);
  // sample a small neighborhood and average to retain macro variation while reducing tiny speckling
  // allow overriding sample count via cfg.macroSmoothSamples
  const samples = cfg.macroSmoothSamples || 3;
  const offsets = [ [0,0], [0.9,0.25], [-0.7,-0.35] ];
  let acc = 0;
  for (let i = 0; i < samples; i++) {
    const o = offsets[i % offsets.length];
    acc += macroSampler(warped.x + o[0], warped.y + o[1]);
  }
  const v = acc / samples; // -1..1 averaged
  const base = (v + 1) / 2; // 0..1

  // Map base to elevation with gentler shallow band and stronger continental mass
  const seaLevel = typeof cfg.seaLevel === 'number' ? cfg.seaLevel : 0.52;
  const shallowBand = 0.26;

  let h;
  if (base < seaLevel) {
    h = (base / seaLevel) * shallowBand * 0.9; // slightly compress shallow range
  } else {
    // expand land range so continents read as larger masses
    h = shallowBand + ((base - seaLevel) / (1 - seaLevel)) * (1 - shallowBand);
  }
  // clamp
  if (h < 0) h = 0;
  if (h > 1) h = 1;
  return h;
}

function computeTilePart(ctx) {
  const q = ctx.q;
  const r = ctx.r;
  const cfg = ctx.cfg.layers.layer1 || {};
  // Debug override: when debugging positions, allow a simple deterministic
  // square pattern so renders can be verified easily.
  // Support both 'square' (legacy -> world-aligned) and explicit 'axial-square'
  const dbg = typeof cfg.debugPattern === 'string' ? cfg.debugPattern : '';
  if (dbg === 'square' || dbg === 'world-square' || dbg === 'axial-square') {
  // Produce a world-axis-aligned square so debug geometry maps to rendered XZ
    const size = typeof cfg.testSquareSize === 'number' ? cfg.testSquareSize : 6;
    const centerQ = typeof cfg.testSquareCenterQ === 'number' ? cfg.testSquareCenterQ : 0;
    const centerR = typeof cfg.testSquareCenterR === 'number' ? cfg.testSquareCenterR : 0;
    let inside = false;
    if (dbg === 'axial-square') {
      inside = isInsideAxialSquare(q, r, centerQ, centerR, size);
    } else {
      // world aligned
      inside = isInsideWorldSquare(q, r, centerQ, centerR, size, { hexSize: 1 });
    }
    const hNorm = inside ? 1 : 0;
    const h = hNorm * (typeof cfg.heightMult === 'number' ? cfg.heightMult : 1.0);
    const seaLevel = typeof cfg.seaLevel === 'number' ? cfg.seaLevel : 0.52;
    const isWater = hNorm <= seaLevel;
    const depthBand = isWater ? (hNorm < seaLevel - 0.15 ? 'deep' : 'shallow') : 'land';
    return {
      elevation: { add: h, raw: h, normalized: hNorm },
      bathymetry: { depthBand, seaLevel },
      slope: 0.0
    };
  }

  // Minimal FBM Layer: preserve seeded simplex FBM but reduce to a very
  // low-frequency, low-octave configuration so continents are large and
  // changes between adjacent tiles are minimal.
  const heightMult = typeof cfg.heightMult === 'number' ? cfg.heightMult : 1.0;
  // continentScale is world-space distance over which macro features vary.
  // Use a smaller default so slopes appear across tens/hundreds of hexes. Tuned to favor large contiguous landmasses.
  const continentScale = typeof cfg.continentScale === 'number' ? cfg.continentScale : 120; // tuned default
  const noise = makeSimplex(ctx.seed);

  // Minimal FBM: 3 octaves, single sample, higher gain to retain contrast
  // Default to slightly higher octave/gain to increase low-frequency contrast for continents
  const macroOctaves = typeof cfg.macroOctaves === 'number' ? cfg.macroOctaves : 4;
  const macroLacunarity = typeof cfg.macroLacunarity === 'number' ? cfg.macroLacunarity : 2.0;
  const macroGain = typeof cfg.macroGain === 'number' ? cfg.macroGain : 1.0;
  const macroSampler = fbmFactory(noise, macroOctaves, macroLacunarity, macroGain);

  const pos = axialToXZShared(q, r, { hexSize: 1 });

  // Sample in world XZ coords scaled down by continentScale so FBM varies over continent distances.
  let sx = pos.x / continentScale;
  let sy = pos.z / continentScale;

  // Apply a gentle low-frequency domain warp to bend broad continents without adding speckle.
  const warpCfg = cfg.domainWarpMacro || cfg.domainWarp || { ampA: 0.6, freqA: 0.03, ampB: 0.15, freqB: 0.18 };
  const warped = domainWarp(noise, sx, sy, warpCfg);

  // Sample a small neighborhood and average to reduce residual speckle while keeping macro detail
  const samples = typeof cfg.macroSmoothSamples === 'number' ? Math.max(1, Math.floor(cfg.macroSmoothSamples)) : 5;
  const offsets = cfg.macroOffsets || [ [0,0], [0.9,0.3], [-0.9,-0.4] ];
  let acc = 0;
  for (let i = 0; i < samples; i++) {
    const o = offsets[i % offsets.length];
    acc += macroSampler(warped.x + o[0], warped.y + o[1]);
  }
  const v = acc / samples; // -1..1 averaged
  const base = (v + 1) / 2; // 0..1

  // expose a simple contrast/exponent (1.0 default). Use pow(base, contrast) so contrast>1 sharpens peaks.
  const contrast = typeof cfg.layerContrast === 'number' ? cfg.layerContrast : 0.92;
  const hNorm = Math.max(0, Math.min(1, Math.pow(base, Math.max(0.0001, contrast))));
  const h = Math.max(0, Math.min(1, hNorm * heightMult));

  return {
    elevation: { add: h, raw: h, normalized: hNorm },
    slope: 0.0
  };
}

function fallback(ctx) {
  const v = Math.abs(Math.sin((ctx.q * 12.9898 + ctx.r * 78.233) % 1));
  const cfg = ctx.cfg.layers.layer1 || {};
  const seaLevel = typeof cfg.seaLevel === 'number' ? cfg.seaLevel : 0.52;
  const isWater = v <= seaLevel;
  const depthBand = isWater ? (v < seaLevel - 0.15 ? 'deep' : 'shallow') : 'land';
  return { elevation: { add: v, raw: v, normalized: v }, bathymetry: { depthBand, seaLevel }, slope: 0.0 };
}

export { computeTilePart, fallback };
