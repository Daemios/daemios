import { SeededRNG } from './rng.js';
import { createNoise2D } from 'simplex-noise';

// Create a seeded noise2D function per tile using our SeededRNG as the
// random source. We return an object with noise2D(x,y) to match the
// previous factory contract used by layers.
export function makeSimplex(seed, x, z) {
  const s = String(seed) + ':' + String(x) + ':' + String(z);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  const lcg = new SeededRNG(h);
  const rngFunc = () => lcg.next();
  const fn = createNoise2D(rngFunc);
  return { noise2D: fn };
}
