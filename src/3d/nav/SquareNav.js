import Nav from './Nav.js';

export default class SquareNav extends Nav {
  constructor(grid, { isBlocked } = {}) {
    super(grid);
    this.blocked = isBlocked || (() => false);
  }

  pathfind(start, end) {
    const frontier = [start];
    const came = new Map();
    came.set(`${start.x},${start.y}`, null);
    while (frontier.length) {
      const cur = frontier.shift();
      if (cur.x === end.x && cur.y === end.y) break;
      this.grid.neighbors(cur).forEach((n) => {
        const key = `${n.x},${n.y}`;
        if (this.blocked(n) || came.has(key)) return;
        frontier.push(n);
        came.set(key, cur);
      });
    }
    const path = [];
    let step = end;
    while (step) {
      path.unshift(step);
      step = came.get(`${step.x},${step.y}`);
    }
    return path;
  }
}
