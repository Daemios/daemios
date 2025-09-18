import { describe, it, expect } from 'vitest';

import { generateTile as sharedGenerate, WorldCoord } from '../lib/worldgen/index.js';
import { computeTilePart as sharedCompute } from '../lib/worldgen/layers/layer01_continents.js';

import { getDefaultConfig } from '../lib/worldgen/index.js';
import { initNoise as initNoiseRegistry } from '../worldgen/noise.js';
import { TileCache } from '../lib/worldgen/utils/tileCache.js';

describe('layer01 parity', () => {
  it('height parity for sample tiles', () => {
    const seed = 'parity-seed';
    const cfg = getDefaultConfig();
    cfg.baseElevation = 0;
    cfg.layers.layer2 = Object.assign({}, cfg.layers.layer2, { enabled: false });
    cfg.layers.layer3 = Object.assign({}, cfg.layers.layer3, { enabled: false });
    cfg.layers.layer3_5 = Object.assign({}, cfg.layers.layer3_5, { enabled: false });
    cfg.layers.layer4 = Object.assign({}, cfg.layers.layer4, { enabled: false });
    cfg.layers.layer5 = Object.assign({}, cfg.layers.layer5, { enabled: false });
    const samples = [ [0,0], [10,5], [23,-12] ];
    for (const [q, r] of samples) {
      const tile = sharedGenerate(seed, { q, r }, cfg);
      const coord = new WorldCoord({ q, r });
      const noiseRegistry = initNoiseRegistry(seed);
      const cache = new TileCache();
      const ctx = {
        seed: String(seed),
        q,
        r,
        x: coord.x,
        z: coord.z,
        world: coord.world,
        cfg,
        coord,
        noiseRegistry,
        noises: noiseRegistry,
        cache,
        cacheWarp: cache.getWarp.bind(cache),
        cacheVoronoi: cache.getVoronoi.bind(cache),
        cacheValue: cache.getValue.bind(cache)
      };
      const sharedPart = sharedCompute(ctx);
      const clientH = tile && tile.elevation && tile.elevation.normalized;
      const sharedH = sharedPart.elevation && sharedPart.elevation.normalized;
      expect(typeof clientH).toBe('number');
      expect(typeof sharedH).toBe('number');
      const baselineDelta = 0.01;
      expect(Math.abs((clientH - sharedH) - baselineDelta)).toBeLessThan(1e-6);
      expect(typeof sharedPart.macroElevation).toBe('number');
      expect(sharedPart.macroElevation).toBe(sharedH);
      expect(typeof sharedPart.plateId).toBe('number');
      expect(sharedPart.ridgeStrength).toBeGreaterThanOrEqual(0);
      expect(sharedPart.ridgeStrength).toBeLessThanOrEqual(1);
      expect(sharedPart.oceanDepth).toBeGreaterThanOrEqual(0);
      const seaLevel = cfg.layers.global.seaLevel;
      if (sharedH < seaLevel) expect(sharedPart.oceanDepth).toBeGreaterThan(0);
      else expect(sharedPart.oceanDepth).toBe(0);
      expect(sharedPart.plate).toBeTruthy();
      expect(typeof sharedPart.plate.edgeDistance).toBe('number');
    }
  });
});
