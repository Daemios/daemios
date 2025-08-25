import * as worldGen from './index';
import { makeEntity } from '../entities';
import { SeededRNG } from '../seeded';
import { WorldGrid } from '../grid/WorldGrid';

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
  const grid = new WorldGrid(1);
  const entities = [];
  for (let q = -radius; q <= radius; q++) {
    for (let r = Math.max(-radius, -q - radius); r <= Math.min(radius, -q + radius); r++) {
        const { x, z } = grid.cellToWorld({ x: q, z: r });
      const cell = gen.getByXZ(x, z);
      // heuristic: prefer low slope, mid elevation land
  // Accept tile-shaped cell or legacy fields wrapper
  const elev = (typeof cell.height === 'number') ? cell.height : (cell.elevation && typeof cell.elevation.normalized === 'number' ? cell.elevation.normalized : (cell.fields && cell.fields.h) || 0);
  const slope = (cell.fields && typeof cell.fields.slope === 'number') ? cell.fields.slope : 1;
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
