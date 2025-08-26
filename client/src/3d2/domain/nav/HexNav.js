// Pathfinding utilities for hex grids using cell indices or world positions.
// Public API uses generic cell indices while axial conversions remain private.

import { WorldGrid } from '../grid/WorldGrid';

// Axial cube distance helper using common {x,z} cell coords
function distance(a, b) {
  const ax = a.x;
  const az = a.z;
  const ay = -ax - az;
  const bx = b.x;
  const bz = b.z;
  const by = -bx - bz;
  return Math.max(Math.abs(ax - bx), Math.abs(ay - by), Math.abs(az - bz));
}

// Internal axial neighbor offsets expressed with {x,z}
const OFFSETS = [
  { x: 1, z: 0 }, { x: -1, z: 0 },
  { x: 0, z: 1 }, { x: 0, z: -1 },
  { x: 1, z: -1 }, { x: -1, z: 1 },
];

/**
 * A* pathfinder operating on a WorldGrid.
 * @param {{x:number,z:number}} start start cell coordinates
 * @param {{x:number,z:number}} goal goal cell coordinates
 * @param {WorldGrid} grid
 * @param {(a:object,b:object)=>number} [costFn]
 * @returns {Array<{x:number,z:number}>|null}
 */
export function findPath(start, goal, grid, costFn) {
  if (!grid) return null;
  const startCell = start;
  const goalCell = goal;

  const startKey = `${startCell.x},${startCell.z}`;
  const goalKey = `${goalCell.x},${goalCell.z}`;
  const open = new Map();
  const closed = new Set();
  const cameFrom = new Map();
  const gScore = new Map();
  const fScore = new Map();

  function keyOf(p) { return `${p.x},${p.z}`; }
  function neighbors(p) {
    return OFFSETS.map(o => ({ x: p.x + o.x, z: p.z + o.z }));
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
    const [cx, cz] = currentKey.split(',').map(Number);
    const current = { x: cx, z: cz };
    if (currentKey === goalKey) {
      const path = [];
      let k = currentKey;
      while (k) {
        const [x, z] = k.split(',').map(Number);
        path.unshift({ x, z });
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
