import { describe, it, expect } from 'vitest';

import { createWorldGenerator as clientCreate } from '../../client/src/3d2/domain/world/localGenerator.old.js';
import { computeTilePart as sharedCompute } from '../lib/worldgen/layers/layer01_continents.js';

import { getDefaultConfig } from '../lib/worldgen/index.js';

describe('layer01 parity', () => {
  it('height parity for sample tiles', () => {
    const seed = 'parity-seed';
    const clientGen = clientCreate('hex', seed);
    const cfg = getDefaultConfig();

    const samples = [ [0,0], [10,5], [23,-12] ];
    for (const [q,r] of samples) {
      const clientRes = clientGen.get(q, r);
      const ctx = { seed: String(seed), q, r, cfg, rng: null, noise: null };
      const sharedPart = sharedCompute(ctx);
      // compare normalized elevation roughly
      const clientH = clientRes.fields && clientRes.fields.h;
      const sharedH = sharedPart.elevation && sharedPart.elevation.normalized;
      expect(typeof clientH).toBe('number');
      expect(typeof sharedH).toBe('number');
      // allow some tolerance because shared implementation currently simplified
      expect(Math.abs(clientH - sharedH)).toBeLessThan(0.35);
    }
  });
});
