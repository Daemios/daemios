import { SeededRNG } from '../seeded';
import { fbm, domainWarp } from './noiseUtils';
import worldConfig from './worldConfig.json';
import { continentalMask } from './continents';

// Minimal, deterministic hex world generator for 3d2.
// Provides createWorldGenerator(type, seed) -> { get(q,r), setTuning(opts) }

const registry = new Map();

function makeNoise(seed) {
  // Lightweight deterministic noise2D implementation for parity tests.
  const rng = new SeededRNG(typeof seed === 'number' ? seed : String(seed).split('').reduce((s,c)=>s+c.charCodeAt(0),0));
  return {
    noise2D(x, y) {
      return rng.next() * 2 - 1; // -1..1
    }
  };
}

function createHexGenerator(seed, opts = {}) {
  const noise = makeNoise(seed);
  let scale = opts.scale || 12.0;
  const heightMult = typeof opts.heightMult === 'number' ? opts.heightMult : 1.0;

  // build an FBM-based height sampler and domain-warp wrapper
  const fbmCfg = worldConfig.fbm || { octaves: 4, lacunarity: 2.0, gain: 0.5 };
  const fbmSampler = fbm(noise, fbmCfg.octaves, fbmCfg.lacunarity, fbmCfg.gain);
  const warpCfg = worldConfig.domainWarp || {};

  function heightAt(q, r) {
    // Macro continental mask (smooth, large scale)
    const x = q;
    const z = r;
    const macro = continentalMask(noise, x, z, worldConfig.plateCellSize || 48);

    // Mesoscale detail: sample at tile scale using FBM & warp
    const nx = q / scale;
    const ny = r / scale;
    const w = domainWarp(noise, nx, ny, warpCfg);
    const v = fbmSampler(w.x, w.y); // -1..1
    const detail = (v + 1) / 2;

    // combine macro and detail: macro determines large basins/continents, detail adds local variation
    // weight detail lightly so continents remain the dominant feature
    const detailWeight = 0.35;
    const combined = Math.max(0, Math.min(1, macro * (1 - detailWeight) + detail * detailWeight));
    return combined * heightMult;
  }

  function get(q, r) {
    const h = heightAt(q, r);
    // rough slope estimate: max delta with 6 neighbors
    const neigh = [
      { q: q + 1, r },
      { q: q - 1, r },
      { q, r: r + 1 },
      { q, r: r - 1 },
      { q: q + 1, r: r - 1 },
      { q: q - 1, r: r + 1 },
    ];
    let maxDiff = 0;
    for (const n of neigh) {
      const nh = heightAt(n.q, n.r);
      const d = Math.abs(nh - h);
      if (d > maxDiff) maxDiff = d;
    }
    return { fields: { h, slope: maxDiff } };
  }

  return {
    get,
    setTuning(o) {
      if (o && typeof o.scale === 'number') scale = o.scale; // allow tuning scale
    },
  };
}

// API
export const availableWorldGenerators = ['hex:local'];

// Lightweight memoization: reuse generator instance for the same (type, seed)
// when no custom opts are provided. This avoids repeated initialization cost
// for common code paths that call createWorldGenerator('hex', seed) often.
const _genCache = new Map(); // key -> generator
export function createWorldGenerator(type = 'hex', seed = 'seed', opts = {}) {
  const key = `${type}::${String(seed)}`;
  const hasOpts = opts && Object.keys(opts).length > 0;
  if (!hasOpts && _genCache.has(key)) return _genCache.get(key);
  let gen;
  if (type === 'hex' || type === 'hex:local') gen = createHexGenerator(seed, opts);
  else gen = createHexGenerator(seed, opts);
  if (!hasOpts) _genCache.set(key, gen);
  return gen;
}

export function registerWorldGenerator(name, factory) {
  registry.set(name, factory);
}

export default { availableWorldGenerators, createWorldGenerator, registerWorldGenerator };
