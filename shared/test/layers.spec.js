import { describe, it, expect } from 'vitest';

import { computeTilePart as palette } from '../lib/worldgen/layers/palette.js';
import { computeTilePart as continents } from '../lib/worldgen/layers/continents.js';
import { computeTilePart as plates } from '../lib/worldgen/layers/plates_and_mountains.js';
import { computeTilePart as biomes } from '../lib/worldgen/layers/biomes.js';
import { computeTilePart as clutter } from '../lib/worldgen/layers/clutter.js';
import { computeTilePart as specials } from '../lib/worldgen/layers/specials.js';

const ctxBase = { seed: 'test-seed', x: 0, z: 0, cfg: { layers: {} } };

describe('layer contract smoke tests', () => {
  it('palette returns palette object', () => {
    const p = palette(ctxBase);
    expect(p).toBeDefined();
    expect(p.palette).toBeDefined();
    expect(p.palette.id).toBeTruthy();
  });
  it('continents returns elevation and bathymetry', () => {
    const p = continents(ctxBase);
    expect(p).toBeDefined();
    expect(p.elevation).toBeDefined();
    expect(typeof p.elevation.normalized === 'number').toBe(true);
    expect(p.bathymetry).toBeDefined();
  });
  it('plates returns elevation object', () => {
    const p = plates(ctxBase);
    expect(p).toBeDefined();
    expect(p.elevation).toBeDefined();
  });
  it('biomes returns biome descriptor', () => {
    const p = biomes(ctxBase);
    expect(p).toBeDefined();
    expect(p.biome).toBeDefined();
    expect(p.biome.major).toBeTruthy();
  });
  it('clutter returns clutterHints', () => {
    const p = clutter(ctxBase);
    expect(p).toBeDefined();
    expect(p.clutterHints).toBeDefined();
  });
  it('specials returns special or null', () => {
    const p = specials(ctxBase);
    expect(p).toBeDefined();
    expect(p.hasOwnProperty('special')).toBe(true);
  });
});
