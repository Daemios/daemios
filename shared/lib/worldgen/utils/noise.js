// shared/lib/worldgen/utils/noise.js
// Adopt the client noise utilities to ensure parity across client/server.
// Exposes fbm(noise, ...), domainWarp(noise, x,y,opts), and voronoi.

// makeSimplex: createPerTile seeded noise factory (moved from noiseFactory.js)
import { SeededRNG } from './rng.js';
import { createNoise2D } from 'simplex-noise';

export function makeSimplex(seed, x, z) {
  const s = String(seed) + ':' + String(x) + ':' + String(z);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  const lcg = new SeededRNG(h);
  const rngFunc = () => lcg.next();
  const fn = createNoise2D(rngFunc);
  return { noise2D: fn };
}

export function fbm(noise, octaves = 4, lacunarity = 2.0, gain = 0.5) {
  return function (x, y) {
    let amplitude = 1.0;
    let frequency = 1.0;
    let sum = 0.0;
    let max = 0.0;
    for (let i = 0; i < octaves; i++) {
      sum += amplitude * noise.noise2D(x * frequency, y * frequency);
      max += amplitude;
      amplitude *= gain;
      frequency *= lacunarity;
    }
    return sum / max;
  };
}

export function domainWarp(noise, x, y, opts = {}) {
  const ampA = typeof opts.ampA === 'number' ? opts.ampA : 0.8;
  const freqA = typeof opts.freqA === 'number' ? opts.freqA : 0.4;
  const ampB = typeof opts.ampB === 'number' ? opts.ampB : 0.25;
  const freqB = typeof opts.freqB === 'number' ? opts.freqB : 2.0;

  const wx = noise.noise2D(x * freqA, y * freqA) * ampA;
  const wy = noise.noise2D((x + 100) * freqA, (y + 100) * freqA) * ampA;

  const bx = noise.noise2D((x + wx) * freqB, (y + wy) * freqB) * ampB;
  const by = noise.noise2D((x + 200 + wx) * freqB, (y + 200 + wy) * freqB) * ampB;

  return { x: x + wx + bx, y: y + wy + by };
}

export function voronoi(x, y, cellSize = 16, seed = 0) {
  const gx = x / cellSize;
  const gy = y / cellSize;
  const ix = Math.floor(gx);
  const iy = Math.floor(gy);
  let best = { dist: Infinity, id: null, fx: 0, fy: 0 };
  for (let j = iy - 1; j <= iy + 1; j++) {
    for (let i = ix - 1; i <= ix + 1; i++) {
      const hx = hash2(i, j, seed);
      const hy = hash2(i, j, seed + 1);
      const siteX = i + hx;
      const siteY = j + hy;
      const dx = siteX - gx;
      const dy = siteY - gy;
      const d = Math.sqrt(dx * dx + dy * dy) * cellSize;
      if (d < best.dist) {
        best = { dist: d, id: `${i}_${j}`, fx: siteX * cellSize, fy: siteY * cellSize };
      }
    }
  }
  return best;
}

function hash2(i, j, seed = 0) {
  const s = Math.sin(i * 127.1 + j * 311.7 + seed * 0.7) * 43758.5453123;
  return fract(s);
}

function fract(v) { return v - Math.floor(v); }

export default { fbm, domainWarp, voronoi };

// valueNoise: simple deterministic pseudo-noise that uses ctx.rng when available
export function valueNoise(ctx, x, y) {
  // If a rng is provided on the context, use it to introduce tile-scoped determinism
  const r = ctx && ctx.rng && typeof ctx.rng.random === 'function' ? ctx.rng.random() : Math.random();
  const v = Math.sin(x * 12.9898 + y * 78.233 + r * 43758.5453);
  return fract(v);
}
