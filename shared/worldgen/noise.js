import { makeSimplex } from '../lib/worldgen/utils/noise.js';

const cache = new Map();
const ATTRIBUTES = ['elevation', 'moisture', 'flora', 'passable', 'territory'];

// Create attribute-keyed simplex noise instances using the project's
// deterministic makeSimplex factory so seeding and tile-scoped caching are
// consistent across the shared worldgen code.
export function initNoise(seed = '') {
  if (cache.has(seed)) return cache.get(seed);
  const noises = {};
  for (const attr of ATTRIBUTES) {
    // makeSimplex takes (seed, x, z) and caches per (seed,x,z); here we
    // only need a Simplex-like object for attribute sampling, so call
    // makeSimplex with seed+attr and x/z of 0 which yields a deterministic
    // noise2D function per attribute.
    const n = makeSimplex(String(seed) + ':' + attr, 0, 0);
    noises[attr] = n;
  }
  cache.set(seed, noises);
  return noises;
}

export function sampleNoise(noises, x, y) {
  const values = {};
  for (const attr of Object.keys(noises)) {
    const n = noises[attr];
    values[attr] = (n.noise2D(x * 0.05, y * 0.05) + 1) / 2;
  }
  return values;
}

export default { initNoise, sampleNoise };
