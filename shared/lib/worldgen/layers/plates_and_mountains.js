/**
 * Plates and Mountains — mesoscale plate-aligned mountain contribution.
 * Purpose: add conservative mountain belts and plate metadata used by later
 * layers to shape terrain and biome edges.
 */
import { fbm as fbmFactory } from '../utils/noise.js';
import { seedStringToNumber } from '../utils/general.js';
import { makeSimplex } from '../utils/noise.js';

function computeTilePart(ctx) {
  // canonical plates_and_mountains config
  const cfg = (ctx.cfg && ctx.cfg.layers && ctx.cfg.layers.plates_and_mountains) ? ctx.cfg.layers.plates_and_mountains : {};
  const plateSize = (typeof cfg.plateCellSize === 'number') ? cfg.plateCellSize : 256;
  const amp = (typeof cfg.plateMountainAmplitude === 'number') ? cfg.plateMountainAmplitude : 0.12; // max added normalized height
  const fbmCfg = cfg.platesFbm || { octaves: 3, lacunarity: 2.0, gain: 0.5 };

  // FBM-based mesoscale ridging (no plates): sample at mesoscale frequency
  const noise = makeSimplex(String(ctx.seed));
  const fbmSampler = fbmFactory(noise, fbmCfg.octaves || 3, fbmCfg.lacunarity || 2.0, fbmCfg.gain || 0.5);
  // sample at a mesoscale grid to produce ridging that is cohesive but not radial
  const sx = ctx.x * (1.0 / Math.max(1, plateSize));
  const sy = ctx.z * (1.0 / Math.max(1, plateSize));
  const v = fbmSampler(sx * 1.5, sy * 1.5); // -1..1
  const fv = Math.max(0, Math.min(1, (v + 1) / 2));

  const mountain = amp * fv;

  return {
    elevation: { raw: mountain, normalized: mountain },
    slope: 0
  };
}

function fallback(ctx) {
  // conservative: no mountain contribution when fallback
  return { elevation: { raw: 0, normalized: 0 }, slope: 0, plate: { id: null, edgeDistance: 1 } };
}

export { computeTilePart, fallback };

