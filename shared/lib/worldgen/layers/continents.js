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
import { seedStringToNumber, pseudoRandom, smoothstep, findNearestPlate } from '../utils/general.js';

function computeTilePart(ctx) {
	const cfg = (ctx && ctx.cfg && ctx.cfg.layers && ctx.cfg.layers.layer1) ? ctx.cfg.layers.layer1 : {};
	// authoritative seaLevel: prefer explicit layer1.bathymetry then global then default
	const seaLevel = (typeof cfg.seaLevel === 'number') ? cfg.seaLevel
		: (ctx && ctx.cfg && ctx.cfg.layers && ctx.cfg.layers.global && typeof ctx.cfg.layers.global.seaLevel === 'number') ? ctx.cfg.layers.global.seaLevel
			: 0.22;
	const clampAboveSea = (typeof cfg.clampAboveSea === 'number') ? cfg.clampAboveSea : 0.28;

	const plateSize = (typeof cfg.plateCellSize === 'number') ? cfg.plateCellSize : 512;

	// noise config
	const fbmCfg = cfg.fbm || { octaves: 5, lacunarity: 2.0, gain: 0.5 };
	const seed = String(ctx && ctx.seed ? ctx.seed : '0');
	const seedNum = seedStringToNumber(seed);

	// create deterministic noise instances
	const noise = makeSimplex(seed);
	const baseSampler = fbmFactory(noise, fbmCfg.octaves || 5, fbmCfg.lacunarity || 2.0, fbmCfg.gain || 0.5);
	const maskSampler = fbmFactory(noise, Math.max(2, (fbmCfg.octaves || 5) - 2), 2.0, 0.6);

	// domain warp at a very large scale to avoid small repetition
	const wx = ctx.x * 0.002;
	const wz = ctx.z * 0.002;
	const warped = domainWarp(noise, wx, wz, { ampA: 0.9, freqA: 0.35, ampB: 0.25, freqB: 1.6 });

	// coarse continent mask (large features)
	const maskRaw = (maskSampler(warped.x * 0.6, warped.y * 0.6) + 1) / 2; // 0..1
	// bias mask to produce roughly ~40% land: use a thresholding with smoothstep
	const desiredLandFrac = (typeof cfg.desiredLandFraction === 'number') ? cfg.desiredLandFraction : 0.40;
	// map maskRaw so that values above thresh become land with a soft falloff
	const thresh = 1.0 - desiredLandFrac; // higher thresh makes less land
	const mask = smoothstep((maskRaw - thresh) / 0.25); // softened edge

	// plate-centered falloff to keep continents cohesive and avoid too many small islands
	const plate = findNearestPlate(ctx.x, ctx.z, plateSize, seedNum);
	const plateRadius = plateSize * 0.5;
	const nd = Math.max(0, Math.min(1, plate.dist / Math.max(1e-9, plateRadius)));
	// favor land near plate centers, decay towards edges
	const plateMask = 1 - smoothstep(Math.pow(nd, 1.1));

	// small-scale variation to avoid perfectly smooth continents
	const baseRaw = (baseSampler(warped.x * 1.1, warped.y * 1.1) + 1) / 2; // 0..1

	// combine components: coarse mask drives presence, plateMask keeps cohesion, baseRaw adds texture
	let h = mask * plateMask * (0.6 * baseRaw + 0.4 * mask);

	// Ensure oceans surround continents by smoothly blending toward zero below seaLevel
	// When h is below a small threshold treat as ocean (leave near zero)
	const oceanSoft = 0.02;
	h = (h < oceanSoft) ? h * 0.5 : h;

	// Enforce max land clamp so land cannot rise arbitrarily above sea level
	if (h > seaLevel) h = Math.min(h, seaLevel + clampAboveSea);

	// normalize safety
	const normalized = Math.max(0, Math.min(1, h));

	// simple slope estimate (finite differences) to help clutter/placement layers
	let slope = 0;
	try {
		const eps = 1.0;
		const n1 = (baseSampler(domainWarp(noise, (ctx.x + eps) * 0.002, wz, { ampA: 0.9, freqA: 0.35, ampB: 0.25, freqB: 1.6 }).x * 1.1,
			domainWarp(noise, (ctx.x + eps) * 0.002, wz, { ampA: 0.9, freqA: 0.35, ampB: 0.25, freqB: 1.6 }).y * 1.1) + 1) / 2;
		const n2 = (baseSampler(domainWarp(noise, (ctx.x - eps) * 0.002, wz, { ampA: 0.9, freqA: 0.35, ampB: 0.25, freqB: 1.6 }).x * 1.1,
			domainWarp(noise, (ctx.x - eps) * 0.002, wz, { ampA: 0.9, freqA: 0.35, ampB: 0.25, freqB: 1.6 }).y * 1.1) + 1) / 2;
		const n3 = (baseSampler(domainWarp(noise, wx, (ctx.z + eps) * 0.002, { ampA: 0.9, freqA: 0.35, ampB: 0.25, freqB: 1.6 }).x * 1.1,
			domainWarp(noise, wx, (ctx.z + eps) * 0.002, { ampA: 0.9, freqA: 0.35, ampB: 0.25, freqB: 1.6 }).y * 1.1) + 1) / 2;
		const n4 = (baseSampler(domainWarp(noise, wx, (ctx.z - eps) * 0.002, { ampA: 0.9, freqA: 0.35, ampB: 0.25, freqB: 1.6 }).x * 1.1,
			domainWarp(noise, wx, (ctx.z - eps) * 0.002, { ampA: 0.9, freqA: 0.35, ampB: 0.25, freqB: 1.6 }).y * 1.1) + 1) / 2;
		const dx = Math.abs(n1 - n2);
		const dz = Math.abs(n3 - n4);
		slope = Math.max(0, Math.min(1, (dx + dz) * 0.5 * 5));
	} catch (e) { slope = 0; }

	return {
		elevation: { raw: normalized, normalized },
		slope,
		bathymetry: { seaLevel, clampAboveSea }
	};
}

export { computeTilePart };
