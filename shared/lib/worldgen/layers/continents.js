/**
 * Continents module (extracted from previous layer01_continents).
 * Responsible for macro continent/ocean shape and shallow bathymetry.
 */
import { fbm as fbmFactory } from '../utils/noise.js';
import { makeSimplex } from '../utils/noise.js';
import { seedStringToNumber, pseudoRandom, smoothstep, findNearestPlate } from '../utils/general.js';

function computeTilePart(ctx) {
  const cfg = (ctx.cfg && ctx.cfg.layers && ctx.cfg.layers.layer1) ? ctx.cfg.layers.layer1 : {};
  const plateSizeBase = (typeof cfg.plateCellSize === 'number') ? cfg.plateCellSize : 512;
  const plateSize = Math.max(1, Math.round(plateSizeBase * (typeof cfg.continentScale === 'number' ? cfg.continentScale : 1)));
  const noise = makeSimplex(String(ctx.seed));
  const fbmCfg = cfg.fbm || { octaves: 1, lacunarity: 1.8, gain: 0.3 };
  const macroOctaves = Math.max(1, (fbmCfg.octaves ? Math.max(1, Math.floor(fbmCfg.octaves)) : 1));
  const macroSampler = fbmFactory(noise, macroOctaves, fbmCfg.lacunarity || 1.8, fbmCfg.gain || 0.3);
  const sx = ctx.x / plateSize;
  const sy = ctx.z / plateSize;
  const v = macroSampler(sx, sy);
  const macro = Math.max(0, Math.min(1, (v + 1) / 2));
  const blended = Math.max(0, Math.min(1, macro));
  const seaLevel = (ctx && ctx.cfg && ctx.cfg.layers && ctx.cfg.layers.global && typeof ctx.cfg.layers.global.seaLevel === 'number')
    ? ctx.cfg.layers.global.seaLevel
    : (typeof cfg.seaLevel === 'number' ? cfg.seaLevel : 0.52);
  const shallowBand = (typeof cfg.shallowBand === 'number') ? cfg.shallowBand : 0.26;
  const landMax = (typeof cfg.landMax === 'number') ? cfg.landMax : 0.55;
  const threshold = (typeof cfg.threshold === 'number') ? cfg.threshold : 0.46;
  const clampAboveSea = (typeof cfg.clampAboveSea === 'number') ? cfg.clampAboveSea : 0.05;

  let h = 0;
  if (blended <= threshold) {
    const dampThreshold = (typeof cfg.dampThreshold === 'number') ? cfg.dampThreshold : 0.25;
    const dampPower = (typeof cfg.dampPower === 'number') ? cfg.dampPower : 2.5;
    const dampScale = (typeof cfg.dampScale === 'number') ? cfg.dampScale : 1.0;

    if (blended <= dampThreshold) {
      const t = blended / Math.max(1e-9, dampThreshold);
      const atten = Math.pow(t, dampPower);
      h = atten * shallowBand * dampScale;
    } else {
      const t = (blended - dampThreshold) / Math.max(1e-9, threshold - dampThreshold);
      const dampedBase = Math.pow(dampThreshold / Math.max(1e-9, dampThreshold), dampPower) * shallowBand * dampScale;
      const linearAtThreshold = shallowBand;
      h = dampedBase + t * (linearAtThreshold - dampedBase);
    }
  } else {
    const t = (blended - threshold) / (1 - threshold);
    const s = smoothstep(t);
    h = shallowBand + s * (landMax - shallowBand);
  }

  h = Math.max(0, Math.min(1, h));
  // Cap: ensure this macro pass does not exceed seaLevel + clampAboveSea
  const isWater = h <= seaLevel;
  if (!isWater) {
    const maxLand = Math.min(1, seaLevel + clampAboveSea);
    if (h > maxLand) h = maxLand;
  }
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

function fallback(ctx) {
  const cfg = (ctx.cfg && ctx.cfg.layers && ctx.cfg.layers.layer1) ? ctx.cfg.layers.layer1 : {};
  const plateSize = cfg.plateCellSize || 256;
  const v = Math.abs(Math.sin((ctx.x * 12.9898 + ctx.z * 78.233) % 1));
  const base = Math.max(0, Math.min(1, v));
  const seaLevel = (typeof cfg.seaLevel === 'number') ? cfg.seaLevel : 0.52;
  const shallowBandFallback = (typeof cfg.shallowBand === 'number') ? cfg.shallowBand : 0.26;
  const h = base * shallowBandFallback * 0.9;
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
