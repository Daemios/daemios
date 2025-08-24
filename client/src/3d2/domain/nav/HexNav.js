// Pathfinding utilities for hex grids using cell indices or world positions.
// Public API uses generic cell indices while axial conversions remain private.

import { WorldGrid } from '../grid/WorldGrid';

// Axial cube distance helper
function distance(a, b) {
  const ax = a.q;
  const az = a.r;
  const ay = -ax - az;
  const bx = b.q;
  const bz = b.r;
  const by = -bx - bz;
  return Math.max(Math.abs(ax - bx), Math.abs(ay - by), Math.abs(az - bz));
}

// Internal axial neighbor offsets
const OFFSETS = [
  { q: 1, r: 0 }, { q: -1, r: 0 },
  { q: 0, r: 1 }, { q: 0, r: -1 },
  { q: 1, r: -1 }, { q: -1, r: 1 },
];

/**
 * A* pathfinder operating on a WorldGrid.
 * @param {{q:number,r:number}|{x:number,z:number}} start
 * @param {{q:number,r:number}|{x:number,z:number}} goal
 * @param {WorldGrid} grid
 * @param {(a:object,b:object)=>number} [costFn]
 * @returns {Array<{q:number,r:number}>|null}
 */
export function findPath(start, goal, grid, costFn) {
  if (!grid) return null;
  const startCell = ('q' in start && 'r' in start) ? start : grid.worldToCell(start.x, start.z);
  const goalCell = ('q' in goal && 'r' in goal) ? goal : grid.worldToCell(goal.x, goal.z);

  const startKey = `${startCell.q},${startCell.r}`;
  const goalKey = `${goalCell.q},${goalCell.r}`;
  const open = new Map();
  const closed = new Set();
  const cameFrom = new Map();
  const gScore = new Map();
  const fScore = new Map();

  function keyOf(p) { return `${p.q},${p.r}`; }
  function neighbors(p) {
    return OFFSETS.map(o => ({ q: p.q + o.q, r: p.r + o.r }));
  }

  gScore.set(startKey, 0);
  fScore.set(startKey, distance(startCell, goalCell));
  open.set(startKey, startCell);

  while (open.size) {
    let currentKey = null;
    let currentF = Infinity;
    for (const [k] of open) {
      const f = fScore.get(k) ?? Infinity;
      if (f < currentF) { currentF = f; currentKey = k; }
    }
    const [cq, cr] = currentKey.split(',').map(Number);
    const current = { q: cq, r: cr };
    if (currentKey === goalKey) {
      const path = [];
      let k = currentKey;
      while (k) {
        const [q, r] = k.split(',').map(Number);
        path.unshift({ q, r });
        k = cameFrom.get(k);
      }
      return path;
    }
    open.delete(currentKey);
    closed.add(currentKey);
    for (const n of neighbors(current)) {
      const nk = keyOf(n);
      if (closed.has(nk)) continue;
      const tentativeG = (gScore.get(currentKey) ?? Infinity) + (typeof costFn === 'function' ? costFn(current, n) : 1);
      if (!open.has(nk) || tentativeG < (gScore.get(nk) ?? Infinity)) {
        cameFrom.set(nk, currentKey);
        gScore.set(nk, tentativeG);
        fScore.set(nk, tentativeG + distance(n, goalCell));
        open.set(nk, n);
      }
    }
  }
  return null;
}

export default { findPath };
