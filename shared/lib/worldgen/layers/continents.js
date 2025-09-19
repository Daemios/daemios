/**
 * Continents — macro land/ocean shape and shallow bathymetry.
 * Purpose: produce large-scale continent and ocean masks and basic bathymetry
 * that downstream layers reference when building finer terrain.
 * 
 * Requirements:
 * - Max land clamp: land elevation must be <= seaLevel + clampAboveSea
 * - Continents must form as distinct, cohesive landmasses.
 * - Oceans should surround these landmasses and slope smoothly down to the world’s minimum elevation.
 * - The overall ratio of sea to land should be about 60/40, favoring sea.
 * - Do not produce terrain that clusters around a single “average” elevation without clear seas.
 * - Do not allow land bias that makes continents too plentiful.
 * - Do not generate oversized inland lakes that mimic oceans.
 */
// --- Imports -----------------------------------------------------------------
import { fbm as fbmFactory } from '../utils/noise.js';
import { makeSimplex } from '../utils/noise.js';
import { seedStringToNumber, pseudoRandom, smoothstep, findNearestPlate } from '../utils/general.js';

// --- Overview ---------------------------------------------------------------
/*
 * Continents — macro land/ocean shape and shallow bathymetry.
 * Purpose: produce large-scale continent and ocean masks and basic bathymetry
 * that downstream layers reference when building finer terrain.
 *
 * Key design goals in this refactor:
 * - Keep original numeric behavior exactly the same.
 * - Group configuration reads and helper utilities for clarity.
 * - Extract logical steps (sampling, mapping, damping, clamping) into
 *   small named blocks so the intent is obvious at a glance.
 */

function computeTilePart(ctx) {
  // ---------------------------
  // 1) configuration + samplers
  // ---------------------------
  const cfg = (ctx.cfg && ctx.cfg.layers && ctx.cfg.layers.layer1) ? ctx.cfg.layers.layer1 : {};

  const plateSizeBase = (typeof cfg.plateCellSize === 'number') ? cfg.plateCellSize : 512;
  const plateSize = Math.max(1, Math.round(plateSizeBase * (typeof cfg.continentScale === 'number' ? cfg.continentScale : 1)));

  const fbmCfg = cfg.fbm || { octaves: 1, lacunarity: 1.8, gain: 0.3 };
  const macroOctaves = Math.max(1, (fbmCfg.octaves ? Math.max(1, Math.floor(fbmCfg.octaves)) : 1));

  const noise = makeSimplex(String(ctx.seed));
  const macroSampler = fbmFactory(noise, macroOctaves, fbmCfg.lacunarity || 1.8, fbmCfg.gain || 0.3);

  // ---------------------------
  // 2) sample macro noise -> [0..1]
  // ---------------------------
  const sx = ctx.x / plateSize;
  const sy = ctx.z / plateSize;
  const v = macroSampler(sx, sy);
  const macro = Math.max(0, Math.min(1, (v + 1) / 2));
  let blended = Math.max(0, Math.min(1, macro)); // safety clamp

  // ---------------------------
  // neighborhood smoothing + sea bias
  // - smooth small features so continents stay cohesive
  // - bias slightly toward sea to reach ~60/40 sea/land
  // ---------------------------
  const smoothing = (typeof cfg.continentSmoothing === 'number') ? cfg.continentSmoothing : 0.6; // [0..1]
  const seaBiasPower = (typeof cfg.seaBiasPower === 'number') ? cfg.seaBiasPower : 1.08; // >1 biases toward sea
  const lakeSuppress = (typeof cfg.lakeSuppress === 'boolean') ? cfg.lakeSuppress : true;

  // sample a small neighborhood in macro-space to compute a local average
  const _sampleNeighborhood = (sampler, x, y) => {
    // a compact 3x3 kernel around the center in sampler-space
    const offs = [
      [0, 0], [0.6, 0], [-0.6, 0], [0, 0.6], [0, -0.6], [0.45, 0.45], [-0.45, 0.45], [0.45, -0.45], [-0.45, -0.45]
    ];
    let acc = 0;
    for (let i = 0; i < offs.length; i++) {
      const o = offs[i];
      const vv = sampler(x + o[0], y + o[1]);
      const m = Math.max(0, Math.min(1, (vv + 1) / 2));
      acc += m;
    }
    return acc / offs.length;
  };

  const localAvg = _sampleNeighborhood(macroSampler, sx, sy);
  // mix center value with local average to remove small islands/lakes
  blended = blended * (1 - smoothing) + localAvg * smoothing;
  // slight sea bias mapping to favor water (tunable)
  blended = Math.max(0, Math.min(1, Math.pow(blended, seaBiasPower)));

  // ---------------------------
  // 3) read global parameters
  // ---------------------------
  const seaLevel = (ctx && ctx.cfg && ctx.cfg.layers && ctx.cfg.layers.global && typeof ctx.cfg.layers.global.seaLevel === 'number')
    ? ctx.cfg.layers.global.seaLevel
    : (typeof cfg.seaLevel === 'number' ? cfg.seaLevel : 0.52);

  const shallowBand = (typeof cfg.shallowBand === 'number') ? cfg.shallowBand : 0.26;
  const landMax = (typeof cfg.landMax === 'number') ? cfg.landMax : 0.55;
  const threshold = (typeof cfg.threshold === 'number') ? cfg.threshold : 0.46;
  const clampAboveSea = (typeof cfg.clampAboveSea === 'number') ? cfg.clampAboveSea : 0.05;

  // damping parameters (only used in the blended <= threshold branch)
  const dampThreshold = (typeof cfg.dampThreshold === 'number') ? cfg.dampThreshold : 0.25;
  const dampPower = (typeof cfg.dampPower === 'number') ? cfg.dampPower : 2.5;
  const dampScale = (typeof cfg.dampScale === 'number') ? cfg.dampScale : 1.0;

  // ---------------------------
  // 4) compute raw macro height h in [0..1]
  //    - smooth / damp shallow zones
  //    - interpolate into land values above threshold
  // ---------------------------
  let h = 0;

  if (blended <= threshold) {
    // Shallow / near-sea regime with damping near zero to avoid bias
    if (blended <= dampThreshold) {
      const t = blended / Math.max(1e-9, dampThreshold);
      const atten = Math.pow(t, dampPower);
      h = atten * shallowBand * dampScale;
    } else {
      // Between dampThreshold and threshold: smooth interpolation up to shallowBand
      const t = (blended - dampThreshold) / Math.max(1e-9, threshold - dampThreshold);
      const dampedBase = Math.pow(dampThreshold / Math.max(1e-9, dampThreshold), dampPower) * shallowBand * dampScale;
      const linearAtThreshold = shallowBand;
      h = dampedBase + t * (linearAtThreshold - dampedBase);
    }
  } else {
    // Land regime: smoothstep to provide gradual slope into landMax
    const t = (blended - threshold) / (1 - threshold);
    const s = smoothstep(t);
    h = shallowBand + s * (landMax - shallowBand);
  }

  // clamp to [0..1]
  h = Math.max(0, Math.min(1, h));

  // ---------------------------
  // 5) enforce global sea-level clamp for macro pass
  // ---------------------------
  const isWater = h <= seaLevel;
  // If lake suppression is enabled, convert isolated water pixels that are
  // surrounded by mostly-land into shallow land to avoid oversized inland lakes.
  if (lakeSuppress && isWater) {
    const surroundingLandness = localAvg; // localAvg is in [0..1], higher -> more land
    const landnessThreshold = Math.min(0.95, threshold + 0.05); // require neighbors to be clearly land
    if (surroundingLandness > landnessThreshold) {
      // promote to shallow land at shallowBand (but still respect clamp)
      h = Math.max(h, shallowBand);
    }
  }
  if (!isWater) {
    const maxLand = Math.min(1, seaLevel + clampAboveSea);
    if (h > maxLand) h = maxLand;
  }
  h = Math.max(0, Math.min(1, h));

  // ---------------------------
  // 6) derive final metadata
  // ---------------------------
  const depthBand = isWater ? (h < seaLevel - 0.12 ? 'deep' : 'shallow') : 'land';
  const plateId = null; // placeholder here — plate assignment happens elsewhere
  const edgeDistance = 1;

  return {
    elevation: { raw: h, normalized: h },
    bathymetry: { depthBand, seaLevel },
    slope: 0.0,
    plate: { id: plateId, edgeDistance }
  };
}

export { computeTilePart };
