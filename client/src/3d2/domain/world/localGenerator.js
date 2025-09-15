/* eslint-disable no-unused-vars */
import * as shared from '../../../../../shared/lib/worldgen/index.js';
import { axialToXZ } from '../../config/layout.js';

// Minimal adapter: return the shared Tile object directly. Consumers should
// use the tile shape (tile.elevation, tile.height, tile.palette, etc.).
export const availableWorldGenerators = ['hex:shared'];

export function createWorldGenerator(_type = 'hex', seed = 'seed', opts = {}) {
  let cfg = opts || {};
  return {
    getByXZ(x, z, q, r) {
      return shared.generateTile(seed, { q, r, x, z }, cfg);
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
      _getConfig() { return cfg; },
      // Bulk-sampling API: sample an axial square centered at qOrigin/rOrigin with half-size S
      sampleBlock(qOrigin, rOrigin, S) {
        try {
          // Prefer a lightweight fast-path if the shared module exposes it.
          if (shared && typeof shared.sampleBlockLight === 'function') {
            return shared.sampleBlockLight(seed, qOrigin, rOrigin, S, cfg);
          }
          if (shared && typeof shared.sampleBlock === 'function') {
            return shared.sampleBlock(seed, qOrigin, rOrigin, S, cfg);
          }
        } catch (e) {
          // fall through to naive sampling
        }
        // Fallback: naive sampling that builds full tiles (slower)
        const N = 2 * S + 1;
        const len = N * N;
        const isWaterBuf = new Uint8Array(len);
        const yScaleBuf = new Float32Array(len);
        let idx = 0;
        for (let r = -S; r <= S; r++) {
          for (let q = -S; q <= S; q++) {
            const qW = q + qOrigin;
            const rW = r + rOrigin;
            const tile = this.get(qW, rW);
            const isWater = tile && (tile.biome === 'deepWater' || tile.biome === 'shallowWater');
            isWaterBuf[idx] = isWater ? 1 : 0;
            const ys = (tile && typeof tile.yScale === 'number') ? Math.max(0, Math.min(1, tile.yScale)) : 0;
            yScaleBuf[idx] = ys;
            idx += 1;
          }
        }
        return { isWaterBuf, yScaleBuf, N };
      }
  };
}

export function registerWorldGenerator(_name, _factory) {
  // intentionally no-op; keep API surface minimal
}

export default { availableWorldGenerators, createWorldGenerator, registerWorldGenerator };
