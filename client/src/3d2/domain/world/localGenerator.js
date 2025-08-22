import * as shared from '../../../../../shared/lib/worldgen/index.js';

// Preserve the old client API surface but delegate generation to the shared
// worldgen. This wrapper returns objects compatible with existing consumers
// that expect `get(q,r)` to return { fields: { h, slope } }.

export const availableWorldGenerators = ['hex:shared'];

const _genCache = new Map();
export function createWorldGenerator(type = 'hex', seed = 'seed', opts = {}) {
  const key = `${type}::${String(seed)}::${JSON.stringify(opts || {})}`;
  if (_genCache.has(key)) return _genCache.get(key);

  // The shared generator produces a full Tile object. We'll wrap it so the
  // previous client code can continue working while we progressively update
  // callers to use the full tile shape.
  const wrapper = {
    get(q, r) {
      const tile = shared.generateTile(seed, q, r, opts);
      // Map fields for backward compatibility. Use elevation h and slope.
      const h = tile.elevation != null ? tile.elevation : (tile.fields && tile.fields.h) || 0;
      const slope = tile.slope != null ? tile.slope : (tile.fields && tile.fields.slope) || 0;
      return { fields: { h, slope }, tile };
    },
    setTuning() {
      // noop for now; tuning should be moved into shared config.
    },
  };

  _genCache.set(key, wrapper);
  return wrapper;
}

export function registerWorldGenerator(name, factory) {
  // no-op registry in this shim; keep API for compatibility
}

export default { availableWorldGenerators, createWorldGenerator, registerWorldGenerator };
