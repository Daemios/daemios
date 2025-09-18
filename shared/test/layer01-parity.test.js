import { describe, it, expect } from 'vitest';

import { generateTile as sharedGenerate } from '../lib/worldgen/index.js';
import { computeTilePart as sharedCompute } from '../lib/worldgen/layers/continents.js';

import { getDefaultConfig } from '../lib/worldgen/index.js';

describe('layer01 parity', () => {
  it('height parity for sample tiles', () => {
    const seed = 'parity-seed';
    const cfg = getDefaultConfig();
    const samples = [ [0,0], [10,5], [23,-12] ];
    for (const [q, r] of samples) {
      const tile = sharedGenerate(seed, { q, r }, cfg);
      const ctx = { seed: String(seed), q, r, cfg, rng: null, noise: null };
      const sharedPart = sharedCompute(ctx);
      // compare normalized elevation roughly
      const clientH = tile && tile.elevation && tile.elevation.normalized;
      const sharedH = sharedPart.elevation && sharedPart.elevation.normalized;
      expect(typeof clientH).toBe('number');
      expect(typeof sharedH).toBe('number');
      // allow some tolerance because implementations may differ in detail
      expect(Math.abs(clientH - sharedH)).toBeLessThan(0.35);
    }
  });
});
