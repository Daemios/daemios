// Minimal square-grid nav placeholder (keeps API parity)
export function findPathSquare(start, goal, neighborsFn, costFn) {
  // naive BFS for demo purposes
  const startKey = `${start.x},${start.y}`;
  const goalKey = `${goal.x},${goal.y}`;
  const queue = [start];
  const cameFrom = new Map();
  const visited = new Set([startKey]);
  function keyOf(p){ return `${p.x},${p.y}`; }
  while (queue.length) {
    const cur = queue.shift();
    const ck = keyOf(cur);
    if (ck === goalKey) {
      const path = [];
      let k = ck;
      while (k) {
        const [x,y] = k.split(',').map(Number);
        path.unshift({ x, y });
        k = cameFrom.get(k);
      }
      return path;
    }
    const neighs = neighborsFn(cur.x, cur.y) || [];
    for (const n of neighs) {
      const nk = keyOf(n);
      if (visited.has(nk)) continue;
      visited.add(nk);
      cameFrom.set(nk, ck);
      queue.push(n);
    }
  }
  return null;
}

export default { findPathSquare };
