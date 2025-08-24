import * as shared from '../../../../../shared/lib/worldgen/index.js';
import { worldXZToAxial, roundAxial } from '../../config/layout.js';

// Minimal adapter: return the shared Tile object directly. Consumers should
// use the tile shape (tile.elevation, tile.height, tile.palette, etc.).
export const availableWorldGenerators = ['hex:shared'];

export function createWorldGenerator(type = 'hex', seed = 'seed', opts = {}) {
  let cfg = opts || {};
  return {
    // Deprecated: prefer getByXZ(x,z)
    get(q, r) {
      return shared.generateTile(seed, q, r, cfg);
    },
    getByXZ(x, z) {
      const frac = worldXZToAxial(x, z, { layoutRadius: 1, spacingFactor: 1 });
      const { q, r } = roundAxial(frac.q, frac.r);
      return this.get(q, r);
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
