import * as worldGen from './index';
import { makeEntity } from '../entities';
import { SeededRNG } from '../seeded';

// Simple deterministic placement helper that samples generator cells inside a
// radius and places a small set of entities (towns) at spots with high elevation
// and low slope.

/**
 * @param {any} seed
 * @param {number} radius axial radius to sample
 * @returns {Array} list of entities
 */
function populateEntities(seed, radius) {
  const gen = worldGen.createWorldGenerator('hex', seed);
  const rng = new SeededRNG(String(seed).split('').reduce((s,c)=>s+c.charCodeAt(0),0));
  const entities = [];
  for (let q = -radius; q <= radius; q++) {
    for (let r = Math.max(-radius, -q - radius); r <= Math.min(radius, -q + radius); r++) {
      const cell = gen.get(q, r);
      // heuristic: prefer low slope, mid elevation land
      const fields = cell.fields || {};
      const elev = fields.h ?? 0;
      const slope = fields.slope ?? 1;
      if (elev > 0.4 && elev < 0.8 && slope < 0.25) {
        // probabilistic placement using seeded RNG. Raised probability so
        // manual testing shows results more reliably.
        if (rng.nextInt(100) < 6) { // ~6% chance per eligible cell
          entities.push(makeEntity('town', { q, r }, { score: Math.round(elev * 100) }));
        }
      }
    }
  }
  return entities;
}

export { populateEntities };
