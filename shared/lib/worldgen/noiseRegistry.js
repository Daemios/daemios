// shared/lib/worldgen/noiseRegistry.js
// Centralized registry for lazily-instantiated noise sources keyed by a
// world seed and logical name. Layers use this to share deterministic
// samplers without re-seeding Simplex/FBM on every tile.

import { makeSimplex } from './noiseFactory.js';
import { fbm as fbmFactory } from './noiseUtils.js';

function clamp(v, min, max) {
  if (v <= min) return min;
  if (v >= max) return max;
  return v;
}

function optsKey(opts = {}) {
  const o = opts || {};
  const oct = typeof o.octaves === 'number' ? clamp(Math.floor(o.octaves), 1, 16) : 'd';
  const lac = typeof o.lacunarity === 'number' ? Number(o.lacunarity).toFixed(3) : 'd';
  const gain = typeof o.gain === 'number' ? Number(o.gain).toFixed(3) : 'd';
  return `${oct}:${lac}:${gain}`;
}

class NoiseRegistry {
  constructor(seed = '') {
    this.seed = String(seed || '');
    this.cache = new Map();
  }

  _key(type, name, extra = '') {
    return `${type}:${name}:${extra}`;
  }

  simplex(name) {
    const key = this._key('simplex', name, '');
    if (this.cache.has(key)) return this.cache.get(key);
    const sampler = makeSimplex(`${this.seed}:${name}`, 0, 0);
    this.cache.set(key, sampler);
    return sampler;
  }

  fbm(name, opts = {}) {
    const ok = optsKey(opts);
    const key = this._key('fbm', name, ok);
    if (this.cache.has(key)) return this.cache.get(key);
    const simplex = this.simplex(name);
    const octaves = typeof opts.octaves === 'number' ? clamp(Math.floor(opts.octaves), 1, 12) : 4;
    const lacunarity = typeof opts.lacunarity === 'number' ? opts.lacunarity : 2.0;
    const gain = typeof opts.gain === 'number' ? opts.gain : 0.5;
    const sampler = fbmFactory(simplex, octaves, lacunarity, gain);
    const fn = (x, y) => sampler(x, y);
    fn._meta = { octaves, lacunarity, gain };
    this.cache.set(key, fn);
    return fn;
  }
}

const REGISTRY_CACHE = new Map();

function getNoiseRegistry(seed = '') {
  const key = String(seed || '');
  if (REGISTRY_CACHE.has(key)) return REGISTRY_CACHE.get(key);
  const reg = new NoiseRegistry(key);
  REGISTRY_CACHE.set(key, reg);
  return reg;
}

export { NoiseRegistry, getNoiseRegistry };
