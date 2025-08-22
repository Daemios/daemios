import { SeededRNG } from './rng.js';

// Avoid importing Node-only 'module' at top-level (Vite/browser will externalize it).
// Instead, attempt a guarded runtime require when running under Node. In browser
// builds this will not run and we fall back to a deterministic JS stub.
let createNoise2D = null;
try {
  // `require` may be available in the Node test/runtime environment. Guard so
  // bundlers targeting the browser don't attempt to resolve it.
  if (typeof process !== 'undefined' && process.versions && process.versions.node && typeof require === 'function') {
    const simplex = require('simplex-noise');
    createNoise2D = simplex && (simplex.createNoise2D || (simplex.default && simplex.default.createNoise2D));
  }
} catch (e) {
  createNoise2D = null;
}

// Create a seeded noise2D function per tile using our SeededRNG as the
// random source. We return an object with noise2D(x,y) to match the
// previous factory contract used by layers.
export function makeSimplex(seed, q, r) {
  const s = String(seed) + ':' + String(q) + ':' + String(r);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  const lcg = new SeededRNG(h);
  const rngFunc = () => lcg.next();

  if (typeof createNoise2D === 'function') {
    const fn = createNoise2D(rngFunc);
    return { noise2D: fn };
  }

  // Fallback deterministic stub if package shape is unexpected
  return {
    noise2D(x, y) {
      const v = Math.sin(x * 12.9898 + y * 78.233 + lcg.next() * 43758.5453);
      return (v - Math.floor(v)) * 2 - 1;
    }
  };
}
