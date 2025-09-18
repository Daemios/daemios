/**
 * Plates and mountains.
 * Conservative mountain/plate contribution that can be refined later.
 *
 * Algorithm (simple, deterministic):
 * - find nearest plate center (grid jittered)
 * - produce a radial mask from the center that peaks near plate edges
 * - modulate mask with an FBM sample to create mountain ridges
 * - scale by configurable amplitude so this layer remains a mesoscale
 *   contribution that other layers can build upon.
 */
import { fbm as fbmFactory } from '../utils/noise.js';
import { seedStringToNumber, findNearestPlate } from '../utils/general.js';
import { makeSimplex } from '../utils/noise.js';

function computeTilePart(ctx) {
  const cfg = (ctx.cfg && ctx.cfg.layers && ctx.cfg.layers.layer1) ? ctx.cfg.layers.layer1 : {};
  const plateSize = (typeof cfg.plateCellSize === 'number') ? cfg.plateCellSize : 256;
  const amp = (typeof cfg.plateMountainAmplitude === 'number') ? cfg.plateMountainAmplitude : 0.12; // max added normalized height
  const fbmCfg = cfg.platesFbm || { octaves: 3, lacunarity: 2.0, gain: 0.5 };

  const seedNum = seedStringToNumber(String(ctx.seed || '0'));
  // find nearest plate center and distance
  const plate = findNearestPlate(ctx.x, ctx.z, plateSize, seedNum);
  const d = plate.dist; // distance to center
  // normalized distance [0..1] relative to plate radius (0..plateSize*0.5)
  const plateRadius = plateSize * 0.5;
  const nd = Math.max(0, Math.min(1, d / Math.max(1e-9, plateRadius)));

  // radial mask: peaks near plate edges (e.g., form mountain belts at 0.6..0.9)
  const beltCenter = 0.75; // relative radius where belts commonly form
  const beltWidth = 0.25;
  const beltT = Math.max(0, 1 - Math.abs((nd - beltCenter) / Math.max(1e-9, beltWidth)));

  // FBM for mesoscale ridging using per-world seed
  const noise = makeSimplex(String(ctx.seed));
  const fbmSampler = fbmFactory(noise, fbmCfg.octaves || 3, fbmCfg.lacunarity || 2.0, fbmCfg.gain || 0.5);
  // sample at plate-local coordinates to keep features aligned to plates
  const sx = (ctx.x - plate.cx) / Math.max(1, plateSize);
  const sy = (ctx.z - plate.cy) / Math.max(1, plateSize);
  const v = fbmSampler(sx * 1.5, sy * 1.5); // -1..1
  const fv = Math.max(0, Math.min(1, (v + 1) / 2));

  // combine belt mask and fbm; produce a conservative mountain height
  const mountain = amp * beltT * fv;

  // Provide plate metadata to aid later passes
  const plateId = `${plate.ix},${plate.iy}`;
  const edgeDistance = nd;

  return {
    elevation: { raw: mountain, normalized: mountain },
    slope: 0,
    plate: { id: plateId, edgeDistance }
  };
}

function fallback(ctx) {
  // conservative: no mountain contribution when fallback
  return { elevation: { raw: 0, normalized: 0 }, slope: 0, plate: { id: null, edgeDistance: 1 } };
}

export { computeTilePart, fallback };

