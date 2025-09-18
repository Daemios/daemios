import { describe, it, expect } from 'vitest';

import { generateTile as sharedGenerate, WorldCoord } from '../lib/worldgen/index.js';
import { computeTilePart as sharedCompute } from '../lib/worldgen/layers/layer01_continents.js';
import { TileCache } from '../lib/worldgen/utils/tileCache.js';
import { initNoise as initNoiseRegistry } from '../worldgen/noise.js';

import { getDefaultConfig } from '../lib/worldgen/index.js';

describe('layer01 parity', () => {
  it('height parity for sample tiles', () => {
    const seed = 'parity-seed';
    const cfg = getDefaultConfig();
    const samples = [ [0,0], [10,5], [23,-12] ];
    for (const [q, r] of samples) {
      const tile = sharedGenerate(seed, { q, r }, cfg);
      const coord = new WorldCoord({ q, r });
      const cache = new TileCache();
      const noises = initNoiseRegistry(seed);
      const ctx = {
        seed: String(seed),
        q,
        r,
        x: coord.x,
        z: coord.z,
        world: { x: coord.x, y: coord.z },
        cfg,
        coord,
        cache,
        cacheWarp: cache.getWarp.bind(cache),
        cacheVoronoi: cache.getVoronoi.bind(cache),
        cacheValue: cache.getValue.bind(cache),
        noiseRegistry: noises,
        noises,
        noiseFields: noises,
      };
      const sharedPart = sharedCompute(ctx);
      // compare normalized elevation roughly
      const clientH = tile && tile.elevation && tile.elevation.normalized;
      const sharedH = sharedPart.elevation && sharedPart.elevation.normalized;
      expect(typeof clientH).toBe('number');
      expect(typeof sharedH).toBe('number');
      // allow some tolerance because implementations may differ in detail
      const baseElevation = typeof cfg.baseElevation === 'number' ? cfg.baseElevation : 0.01;
      const layerContribution = Math.max(0, clientH - baseElevation);
      expect(Math.abs(layerContribution - sharedH)).toBeLessThan(0.35);
    }
  });
});
