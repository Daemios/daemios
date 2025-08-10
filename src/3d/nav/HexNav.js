import Nav from './Nav.js';

export default class HexNav extends Nav {
  constructor(grid, { isBlocked } = {}) {
    super(grid);
    this.blocked = isBlocked || (() => false);
  }

  pathfind(start, end) {
    const frontier = [start];
    const came = new Map();
    came.set(`${start.q},${start.r}`, null);
    while (frontier.length) {
      const cur = frontier.shift();
      if (cur.q === end.q && cur.r === end.r) break;
      this.grid.neighbors(cur).forEach((n) => {
        const key = `${n.q},${n.r}`;
        if (this.blocked(n) || came.has(key)) return;
        frontier.push(n);
        came.set(key, cur);
      });
    }
    const path = [];
    let step = end;
    while (step) {
      path.unshift(step);
      step = came.get(`${step.q},${step.r}`);
    }
    return path;
  }
}
