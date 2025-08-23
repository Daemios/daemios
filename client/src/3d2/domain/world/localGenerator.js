import * as shared from '../../../../../shared/lib/worldgen/index.js';

// Minimal adapter: return the shared Tile object directly. Consumers should
// use the tile shape (tile.elevation, tile.height, tile.palette, etc.).
export const availableWorldGenerators = ['hex:shared'];

export function createWorldGenerator(type = 'hex', seed = 'seed', opts = {}) {
  let cfg = opts || {};
  return {
    get(q, r) {
      return shared.generateTile(seed, q, r, cfg);
    },
    setTuning(newOpts = {}) {
      cfg = Object.assign({}, cfg, newOpts);
    },
    _getConfig() { return cfg; }
  };
}

export function registerWorldGenerator(name, factory) {
  // intentionally no-op; keep API surface minimal
}

export default { availableWorldGenerators, createWorldGenerator, registerWorldGenerator };
