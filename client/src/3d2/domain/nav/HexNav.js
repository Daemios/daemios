// Simple axial distance using cube coordinates (inline to avoid external imports)
function distanceAxial(a, b) {
  const ax = a.q;
  const az = a.r;
  const ay = -ax - az;
  const bx = b.q;
  const bz = b.r;
  const by = -bx - bz;
  return Math.max(Math.abs(ax - bx), Math.abs(ay - by), Math.abs(az - bz));
}

// Simple A* pathfinder for hex axial coordinates using a uniform cost heuristic
export function findPathHex(start, goal, neighborsFn, costFn) {
  // neighborsFn(q,r) => list of {q,r}
  // costFn(a,b) => numeric cost from a to b
  const startKey = `${start.q},${start.r}`;
  const goalKey = `${goal.q},${goal.r}`;
  const open = new Map();
  const closed = new Set();
  const cameFrom = new Map();
  const gScore = new Map();
  const fScore = new Map();

  function keyOf(p) { return `${p.q},${p.r}`; }

  gScore.set(startKey, 0);
  fScore.set(startKey, distanceAxial(start, goal));
  open.set(startKey, start);

  while (open.size) {
    // pick node in open with lowest fScore
    let currentKey = null;
    let currentF = Infinity;
    for (const [k, v] of open) {
      const f = fScore.has(k) ? fScore.get(k) : Infinity;
      if (f < currentF) { currentF = f; currentKey = k; }
    }
    if (!currentKey) break;
    const [cq, cr] = currentKey.split(',').map(Number);
    const current = { q: cq, r: cr };

    if (currentKey === goalKey) {
      // reconstruct path
      const path = [];
      let k = currentKey;
      while (k) {
        const [q,r] = k.split(',').map(Number);
        path.unshift({ q, r });
        k = cameFrom.get(k);
      }
      return path;
    }

    open.delete(currentKey);
    closed.add(currentKey);

    const neighs = neighborsFn(current.q, current.r) || [];
    for (const n of neighs) {
      const nk = keyOf(n);
      if (closed.has(nk)) continue;
      const tentativeG = (gScore.get(currentKey) || Infinity) + (typeof costFn === 'function' ? costFn(current, n) : 1);
      if (!open.has(nk)) open.set(nk, n);
      else if (tentativeG >= (gScore.get(nk) || Infinity)) continue;
      cameFrom.set(nk, currentKey);
      gScore.set(nk, tentativeG);
      fScore.set(nk, tentativeG + distanceAxial(n, goal));
    }
  }
  return null; // no path
}

export default { findPathHex };
