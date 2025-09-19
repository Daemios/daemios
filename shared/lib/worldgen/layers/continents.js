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


export { computeTilePart };
