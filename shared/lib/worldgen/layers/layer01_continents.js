/**
 * The goal of this file is produce a two specific 'passes' of noise to give the world it's basic
 * shape. The first pass is a macro continent pass that gives the world large landmasses
 * and oceans. The second pass is a finer detail pass that adds interesting mountains, hills, ravines,
 * and other LARGE terrain features.
 * 
 * To be clear, 'pass' here does not mean a single sample or function call, but rather
 * a conceptual pass that may involve multiple noise functions and layers blended together.
 * 
 */

// (OLD) Layer 1: macro continents pass using a Voronoi/plate mask blended with low-frequency FBM

import { fbm as fbmFactory } from '../noiseUtils.js';
import { makeSimplex } from '../noiseFactory.js';

function seedStringToNumber(s) {
  let n = 0;
  for (let i = 0; i < s.length; i++) n = (n * 31 + s.charCodeAt(i)) >>> 0;
  return n || 1;
}

function pseudoRandom(ix, iy, seedNum) {
  // simple deterministic hash -> 0..1
  const x = Math.sin((ix * 127.1 + iy * 311.7) + seedNum * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function smoothstep(t) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return t * t * (3 - 2 * t);
}

function findNearestPlate(x, z, plateSize, seedNum) {
  // plate grid coordinates
  // use rounding so plate centers fall on multiples and origin can be inside a plate
  const px = Math.round(x / plateSize);
  const py = Math.round(z / plateSize);
  let best = { dist: Infinity, cx: 0, cy: 0, ix: 0, iy: 0, rand: 0 };
  // search neighboring plate cells (3x3) to approximate Voronoi
  for (let oy = -1; oy <= 1; oy++) {
    for (let ox = -1; ox <= 1; ox++) {
      const ix = px + ox;
      const iy = py + oy;
      const pr = pseudoRandom(ix, iy, seedNum);
      // jitter center within plate to avoid strict grid artifacts
      const jitterX = (pr - 0.5) * plateSize * 0.5;
      const jitterY = (pseudoRandom(ix, iy + 9999, seedNum) - 0.5) * plateSize * 0.5;
      // anchor centers on grid multiples so small x/z ranges can intersect plates
      const cx = ix * plateSize + jitterX;
      const cy = iy * plateSize + jitterY;
      const dx = x - cx;
      const dz = z - cy;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d < best.dist) best = { dist: d, cx, cy, ix, iy, rand: pr };
    }
  }
  return best;
}

function computeTilePart(ctx) {
  const cfg = (ctx.cfg && ctx.cfg.layers && ctx.cfg.layers.layer1) ? ctx.cfg.layers.layer1 : {};
  // Larger plate size for big continents (default set in DEFAULT_CONFIG)
  const plateSizeBase = (typeof cfg.plateCellSize === 'number') ? cfg.plateCellSize : 512;
  const plateSize = Math.max(1, Math.round(plateSizeBase * (typeof cfg.continentScale === 'number' ? cfg.continentScale : 1)));

  // Use a single global-noise sampler (seeded only by the world seed) so sampling
  // across tiles is continuous. Passing q,r to makeSimplex creates per-tile noise
  // functions which breaks continuity and produces stripes/artifacts.
  const noise = makeSimplex(String(ctx.seed));

  // Stricter macro: single-octave FBM and lower gain so macro is very smooth.
  const fbmCfg = cfg.fbm || { octaves: 1, lacunarity: 1.8, gain: 0.3 };
  const macroOctaves = Math.max(1, (fbmCfg.octaves ? Math.max(1, Math.floor(fbmCfg.octaves)) : 1));
  const macroSampler = fbmFactory(noise, macroOctaves, fbmCfg.lacunarity || 1.8, fbmCfg.gain || 0.3);

  // Simple Cartesian scaling for macro sampler
  const sx = ctx.x / plateSize;
  const sy = ctx.z / plateSize;
  // Avoid domain warp for the macro pass (it injects high-frequency energy)
  const v = macroSampler(sx, sy); // -1..1
  const macro = Math.max(0, Math.min(1, (v + 1) / 2));

  // Single-pass macro: use the FBM output directly (no Voronoi plates or neighbor smoothing)
  const blended = Math.max(0, Math.min(1, macro));

  // Optional slight smoothing by nudging toward neighbor plate centers is possible later

  // remap into water vs land bands
  // prefer global sea level from ctx.cfg.layers.global.seaLevel for authoritative value
  const seaLevel = (ctx && ctx.cfg && ctx.cfg.layers && ctx.cfg.layers.global && typeof ctx.cfg.layers.global.seaLevel === 'number')
    ? ctx.cfg.layers.global.seaLevel
    : (typeof cfg.seaLevel === 'number' ? cfg.seaLevel : 0.52);
  // shallowBand is the fixed top of the water gradient (0..1). Use a small
  // constant so that changing seaLevel only affects classification thresholds
  // and palette blending, not absolute tile heights.
  const shallowBand = (typeof cfg.shallowBand === 'number') ? cfg.shallowBand : 0.26;
  const landMax = (typeof cfg.landMax === 'number') ? cfg.landMax : 0.55; // cap for this layer
  const threshold = (typeof cfg.threshold === 'number') ? cfg.threshold : 0.46; // start of land band
  // minimum clamp above sea level for land elevations (in normalized 0..1 space)
  const clampAboveSea = (typeof cfg.clampAboveSea === 'number') ? cfg.clampAboveSea : 0.05;

  let h = 0;
  if (blended <= threshold) {
    // Apply an optional dampening function so low macro values trend
    // strongly toward the minimum/base elevation. This produces
    // gentler slopes out of the seafloor instead of uniformly raised
    // ocean floors when the macro FBM skews high.
    const dampThreshold = (typeof cfg.dampThreshold === 'number') ? cfg.dampThreshold : 0.25;
    const dampPower = (typeof cfg.dampPower === 'number') ? cfg.dampPower : 2.5;
    const dampScale = (typeof cfg.dampScale === 'number') ? cfg.dampScale : 1.0;

  if (blended <= dampThreshold) {
      // Strong attenuation near the minimum: normalized t in [0,1]
      const t = blended / Math.max(1e-9, dampThreshold);
      const atten = Math.pow(t, dampPower);
      // Map attenuated value into ocean band (0..seaLevel), scaled by dampScale
  h = atten * shallowBand * dampScale;
    } else {
      // For intermediate ocean values between dampThreshold and threshold,
      // interpolate smoothly from the attenuated dampThreshold output up to
      // the previous linear mapping at `threshold` so slopes aren't abrupt.
      const t = (blended - dampThreshold) / Math.max(1e-9, threshold - dampThreshold);
      const dampedBase = Math.pow(dampThreshold / Math.max(1e-9, dampThreshold), dampPower) * shallowBand * dampScale; // effectively 0 but kept for clarity
      const linearAtThreshold = shallowBand; // top of shallow/ocean band
      // lerp between dampedBase and linearAtThreshold
      h = dampedBase + t * (linearAtThreshold - dampedBase);
    }
  } else {
    const t = (blended - threshold) / (1 - threshold);
    const s = smoothstep(t);
    // Map land portion into shallowBand..landMax so heights remain in a
    // consistent scale regardless of seaLevel value.
    h = shallowBand + s * (landMax - shallowBand);
  }

  h = Math.max(0, Math.min(1, h));

  // If this sample is classified as land, ensure it is at least `clampAboveSea`
  // above the configured sea level. This prevents tiny islands or near-sea
  // elevations from sitting extremely close to water.
  const isWater = h <= seaLevel;
  if (!isWater) {
    // Enforce a maximum cap above sea level: do not allow this layer to
    // exceed seaLevel + clampAboveSea. This ensures layer1 remains a
    // conservative macro pass and finer layers produce higher features.
    const maxLand = Math.min(1, seaLevel + clampAboveSea);
    if (h > maxLand) h = maxLand;
  }

  // clamp again to be safe
  h = Math.max(0, Math.min(1, h));
  const depthBand = isWater ? (h < seaLevel - 0.12 ? 'deep' : 'shallow') : 'land';
  const plateId = null;
  const edgeDistance = 1;

  return {
    elevation: { raw: h, normalized: h },
    bathymetry: { depthBand, seaLevel },
    slope: 0.0,
    plate: { id: plateId, edgeDistance }
  };
}

// fallback deterministic shallow pattern when layer is disabled
function fallback(ctx) {
  const cfg = (ctx.cfg && ctx.cfg.layers && ctx.cfg.layers.layer1) ? ctx.cfg.layers.layer1 : {};
  const plateSize = cfg.plateCellSize || 256;
  // cheap deterministic pattern
  const v = Math.abs(Math.sin((ctx.x * 12.9898 + ctx.z * 78.233) % 1));
  const base = Math.max(0, Math.min(1, v));
  const seaLevel = (typeof cfg.seaLevel === 'number') ? cfg.seaLevel : 0.52;
  const shallowBandFallback = (typeof cfg.shallowBand === 'number') ? cfg.shallowBand : 0.26;
  const h = base * shallowBandFallback * 0.9; // keep fallback under shallowBand mostly
  const clampAboveSea = (typeof cfg.clampAboveSea === 'number') ? cfg.clampAboveSea : 0.05;
  let hClamped = Math.max(0, Math.min(1, h));
  const isWater = hClamped <= seaLevel;
  if (!isWater) {
    const maxLand = Math.min(1, seaLevel + clampAboveSea);
    if (hClamped > maxLand) hClamped = maxLand;
  }
  const depthBand = isWater ? 'shallow' : 'land';
  const plateId = Math.abs(Math.floor((ctx.x + ctx.z) / plateSize));
  const edgeDistance = Math.abs((ctx.x + ctx.z) % plateSize - (plateSize / 2)) / plateSize;
  return {
    elevation: { raw: hClamped, normalized: hClamped },
    bathymetry: { depthBand, seaLevel },
    slope: 0.0,
    plate: { id: plateId, edgeDistance }
  };
}

export { computeTilePart, fallback };
