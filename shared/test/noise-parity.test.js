import { describe, it, expect } from 'vitest';

import { SeededRNG as ClientSeeded } from '../../client/src/3d2/domain/seeded.js';
import { fbm as clientFbm, domainWarp as clientWarp, voronoi as clientVor } from '../../client/src/3d2/domain/world/noiseUtils.js';

import { SeededRNG as SharedSeeded, create as sharedCreate } from '../lib/worldgen/rng.js';
import { fbm as sharedFbm, domainWarp as sharedWarp, voronoi as sharedVor } from '../lib/worldgen/utils/noise.js';

describe('noise parity between client and shared', () => {
  it('SeededRNG.next sequence matches expected shape (not exact across algos)', () => {
    const s1 = new ClientSeeded(12345);
    const s2 = new SharedSeeded(12345);
    // Check both produce values in 0..1 and that sequences vary
    const a = [s1.next(), s1.next(), s1.next()];
    const b = [s2.next(), s2.next(), s2.next()];
    expect(a.every(v => v >= 0 && v < 1)).toBe(true);
    expect(b.every(v => v >= 0 && v < 1)).toBe(true);
  });

  it('fbm sample functions produce finite values for sample coords', () => {
    const seed = 42;
    const rng = new ClientSeeded(seed);
    const noise = { noise2D: (x,y)=> (rng.next()*2-1) };
    const cf = clientFbm(noise, 4, 2.0, 0.5);
    const v1 = cf(1.23, 4.56);

    const rng2 = new SharedSeeded(seed);
    const noise2 = { noise2D: (x,y)=> (rng2.next()*2-1) };
    const sf = sharedFbm(noise2, 4, 2.0, 0.5);
    const v2 = sf(1.23, 4.56);

    expect(Number.isFinite(v1)).toBe(true);
    expect(Number.isFinite(v2)).toBe(true);
  });

  it('domainWarp returns warped coords and voronoi returns nearest site', () => {
    const rng = new ClientSeeded(7);
    const noise = { noise2D: (x,y)=> rng.next()*2-1 };
    const cw = clientWarp(noise, 0.5, 0.6, {});
    const sw = sharedWarp(noise, 0.5, 0.6, {});
    expect(typeof cw.x).toBe('number');
    expect(typeof sw.x).toBe('number');

    const cv = clientVor(5.5, 12.2, 16, 3);
    const sv = sharedVor(5.5, 12.2, 16, 3);
    expect(cv.id).toBe(sv.id);
    expect(typeof sv.dist).toBe('number');
  });
});
