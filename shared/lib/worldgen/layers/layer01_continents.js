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

import { fbm as fbmFactory } from '../utils/noise.js';
import { makeSimplex } from '../utils/noise.js';

// Thin compatibility shim: forward `computeTilePart` and `fallback` to the
// refactored `continents.js` module. This file previously contained an old
// implementation and was left in an inconsistent, non-module state.

export { computeTilePart, fallback } from './continents.js';

