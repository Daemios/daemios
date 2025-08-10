import Grid from './Grid.js';

export default class SquareGrid extends Grid {
  constructor({ cellSize = 1 } = {}) {
    super();
    this.cellSize = cellSize;
  }

  toWorld({ x, y }) {
    return { x: (x + 0.5) * this.cellSize, y: -(y + 0.5) * this.cellSize, z: 0 };
  }

  toCoord({ x, y }) {
    return { x: Math.floor(x / this.cellSize), y: Math.floor(-y / this.cellSize) };
  }

  neighbors({ x, y }) {
    return [
      { x: x + 1, y }, { x: x - 1, y },
      { x, y + 1 }, { x, y - 1 },
    ];
  }

  distance(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  ring(center, radius) {
    const cells = [];
    for (let dx = -radius; dx <= radius; dx += 1) {
      for (let dy = -radius; dy <= radius; dy += 1) {
        if (Math.abs(dx) + Math.abs(dy) === radius) {
          cells.push({ x: center.x + dx, y: center.y + dy });
        }
      }
    }
    return cells;
  }

  raycastTileLine(a, b) {
    const line = [];
    let x = a.x; let y = a.y;
    const dx = Math.abs(b.x - a.x);
    const dy = Math.abs(b.y - a.y);
    const sx = a.x < b.x ? 1 : -1;
    const sy = a.y < b.y ? 1 : -1;
    let err = dx - dy;
    while (true) {
      line.push({ x, y });
      if (x === b.x && y === b.y) break;
      const e2 = err * 2;
      if (e2 > -dy) { err -= dy; x += sx; }
      if (e2 < dx) { err += dx; y += sy; }
    }
    return line;
  }
}
