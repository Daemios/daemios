// Thin domain wrapper that re-exports the canonical world generator
// implementation. This is JS to avoid TypeScript declaration issues when
// importing the existing generator which is implemented in JS.

import * as gen from './localGenerator';

export const availableWorldGenerators = gen.availableWorldGenerators;
export const createWorldGenerator = gen.createWorldGenerator;
export const registerWorldGenerator = gen.registerWorldGenerator;

// Intentionally minimal: consumers should treat the returned generator as an
// opaque object with `getByXZ(x,z)` (and legacy `get(q,r)`) and optional `setTuning`.
