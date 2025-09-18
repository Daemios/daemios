// shared/lib/worldgen/noiseRegistry.js
// Lazily-constructed per-seed noise registry for world generation layers.

import { createNoise2D } from 'simplex-noise';
import { SeededRNG } from './rng.js';
import { fbm as fbmFactory } from './noiseUtils.js';

const registries = new Map();

function hashString(str) {
  const s = String(str || '');
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

class NoiseRegistry {
  constructor(seed) {
    this.seed = String(seed || '');
    this._simplex = new Map();
    this._fbm = new Map();
  }

  getSimplex(name) {
    const key = String(name || 'default');
    if (this._simplex.has(key)) return this._simplex.get(key);
    const mixSeed = `${this.seed}:${key}`;
    const rng = new SeededRNG(hashString(mixSeed));
    const noise2D = createNoise2D(() => rng.next());
    const simplex = { noise2D };
    this._simplex.set(key, simplex);
    return simplex;
  }

  getFbm(name, opts = {}) {
    const octaves = Math.max(1, Math.floor(typeof opts.octaves === 'number' ? opts.octaves : 4));
    const lacunarity = typeof opts.lacunarity === 'number' ? opts.lacunarity : 2.0;
    const gain = typeof opts.gain === 'number' ? opts.gain : 0.5;
    const key = `${name}:${octaves}:${lacunarity}:${gain}`;
    if (this._fbm.has(key)) return this._fbm.get(key);
    const simplex = this.getSimplex(name);
    const sampler = fbmFactory(simplex, octaves, lacunarity, gain);
    this._fbm.set(key, sampler);
    return sampler;
  }
}

function getNoiseRegistry(seed) {
  const key = String(seed || '');
  if (!registries.has(key)) registries.set(key, new NoiseRegistry(key));
  return registries.get(key);
}

export { getNoiseRegistry, NoiseRegistry };
export default { getNoiseRegistry };
