/**
 * Continents — macro land/ocean shape and shallow bathymetry.
 * Purpose: produce large-scale continents that form as distinct, cohesive landmasses
 * via additive noise layers and domain warping. This layer sets the foundational
 * terrain that downstream layers add upon when building finer terrain.
 * 
 * Requirements:
 * - Max land clamp: land elevation must be <= seaLevel + clampAboveSea
 * - Continents must form as distinct, cohesive landmasses.
 * - Oceans should surround these landmasses and slope smoothly down to the world’s minimum elevation.
 * - The overall ratio of sea to land should be about 60/40, favoring sea.
 * - Do not produce terrain that clusters around a single “average” elevation without clear seas.
 * - Do not allow land bias that makes continents too plentiful.
 * - Do not generate oversized inland lakes that mimic oceans.
 * 
 * Implementation notes:
 * - Every tile starts at a minimum height. The goal of this file is to add positive elevation
 *   to some tiles to create continents, while leaving others near the minimum to form oceans.
 * - Use multiple octaves of FBM noise combined with domain warping to create large-scale
 *   continent shapes that are interesting and non-repetitive.
 */
// --- Imports -----------------------------------------------------------------
import { fbm as fbmFactory, domainWarp } from '../utils/noise.js';
import { makeSimplex } from '../utils/noise.js';
import { seedStringToNumber, pseudoRandom, smoothstep } from '../utils/general.js';

function computeTilePart(ctx) {
	const cfg = (ctx && ctx.cfg && ctx.cfg.layers && ctx.cfg.layers.layer1) ? ctx.cfg.layers.layer1 : {};
	// authoritative seaLevel: prefer explicit layer1.bathymetry then global then default
	const seaLevel = (typeof cfg.seaLevel === 'number') ? cfg.seaLevel
		: (ctx && ctx.cfg && ctx.cfg.layers && ctx.cfg.layers.global && typeof ctx.cfg.layers.global.seaLevel === 'number') ? ctx.cfg.layers.global.seaLevel
			: 0.22;
	const clampAboveSea = (typeof cfg.clampAboveSea === 'number') ? cfg.clampAboveSea : 0.28;

	// noise config: use a single FBM for mask and a smaller one for detail
	const fbmCfg = cfg.fbm || { octaves: 4, lacunarity: 2.0, gain: 0.55 };
	const seed = String(ctx && ctx.seed ? ctx.seed : '0');

	const noise = makeSimplex(seed);
	const maskSampler = fbmFactory(noise, Math.max(2, (fbmCfg.octaves || 4) - 1), fbmCfg.lacunarity || 2.0, fbmCfg.gain || 0.5);
	const detailSampler = fbmFactory(noise, Math.max(1, (fbmCfg.octaves || 4) - 3), fbmCfg.lacunarity || 2.0, (fbmCfg.gain || 0.5) * 0.6);

	// moderate domain warp to avoid grid artifacts while keeping performance
	const wx = ctx.x * 0.0025;
	const wz = ctx.z * 0.0025;
	const warped = domainWarp(noise, wx, wz, { ampA: 0.7, freqA: 0.28, ampB: 0.18, freqB: 1.2 });

	// coarse continent mask (large features) and soft thresholding
	const maskRaw = (maskSampler(warped.x * 0.7, warped.y * 0.7) + 1) / 2;
	const desiredLandFrac = (typeof cfg.desiredLandFraction === 'number') ? cfg.desiredLandFraction : 0.40;
	const thresh = 1.0 - desiredLandFrac;
	const mask = smoothstep((maskRaw - thresh) / 0.2);

	// small-scale detail to break smoothness
	const detail = (detailSampler(warped.x * 1.1, warped.y * 1.1) + 1) / 2;

	// combine mask and detail (simpler blend than before)
	let h = mask * (0.7 * detail + 0.3 * mask);

	// gently reduce small islands
	const oceanSoft = 0.03;
	if (h < oceanSoft) h *= 0.45;

	// clamp above sea
	if (h > seaLevel) h = Math.min(h, seaLevel + clampAboveSea);

	// normalize safety
	const normalized = Math.max(0, Math.min(1, h));

	// simple slope estimate (finite differences) to help clutter/placement layers
	let slope = 0;
	// simpler finite-difference slope estimate using detailSampler
	try {
		const eps = 1.0;
		const dpx = (detailSampler((ctx.x + eps) * 0.0025, ctx.z * 0.0025) + 1) / 2;
		const dmx = (detailSampler((ctx.x - eps) * 0.0025, ctx.z * 0.0025) + 1) / 2;
		const dpy = (detailSampler(ctx.x * 0.0025, (ctx.z + eps) * 0.0025) + 1) / 2;
		const dmy = (detailSampler(ctx.x * 0.0025, (ctx.z - eps) * 0.0025) + 1) / 2;
		const dx = Math.abs(dpx - dmx);
		const dz = Math.abs(dpy - dmy);
		slope = Math.max(0, Math.min(1, (dx + dz) * 2.5));
	} catch (e) { slope = 0; }

	return {
		elevation: { raw: normalized, normalized },
		slope,
		bathymetry: { seaLevel, clampAboveSea }
	};
}

export { computeTilePart };
