// shared/lib/worldgen/utils/tileCache.js
// Lightweight helper for memoizing expensive per-tile computations within
// a layer. Each tile evaluation gets its own TileCache instance so cached
// values remain deterministic and side-effect free.

class TileCache {
  constructor() {
    this._map = new Map();
  }

  get(key, factory) {
    if (this._map.has(key)) return this._map.get(key);
    if (typeof factory === 'function') {
      const value = factory();
      this._map.set(key, value);
      return value;
    }
    return undefined;
  }

  set(key, value) {
    this._map.set(key, value);
    return value;
  }

  has(key) {
    return this._map.has(key);
  }
}

function ensureTileCache(ctx) {
  if (ctx && ctx.tileCache instanceof TileCache) return ctx.tileCache;
  const cache = new TileCache();
  if (ctx) ctx.tileCache = cache;
  return cache;
}

export { TileCache, ensureTileCache };
