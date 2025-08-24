import * as shared from '../../../../../shared/lib/worldgen/index.js';
import { axialToXZ } from '../../config/layout.js';

// Minimal adapter: return the shared Tile object directly. Consumers should
// use the tile shape (tile.elevation, tile.height, tile.palette, etc.).
export const availableWorldGenerators = ['hex:shared'];

export function createWorldGenerator(type = 'hex', seed = 'seed', opts = {}) {
  let cfg = opts || {};
  return {
    getByXZ(x, z, q, r) {
      return shared.generateTile(seed, q, r, x, z, cfg);
    },
    // Helper for hex callers: derive world {x,z} from {q,r}
    getByQR(q, r) {
      const coords = axialToXZ(q, r, { layoutRadius: 1, spacingFactor: 1 });
      return this.getByXZ(coords.x, coords.z, q, r);
    },
    // Legacy: prefer getByQR(q,r) or getByXZ(x,z,q,r)
    get(q, r) {
      return this.getByQR(q, r);
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
