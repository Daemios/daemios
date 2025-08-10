export default class Grid {
  toWorld(coord) {
    throw new Error('toWorld not implemented');
  }

  toCoord(world) {
    throw new Error('toCoord not implemented');
  }

  neighbors(coord) {
    return [];
  }

  distance(a, b) {
    return 0;
  }

  ring(center, radius) {
    return [];
  }

  spiral(center, radius) {
    const cells = [];
    for (let r = 1; r <= radius; r += 1) cells.push(...this.ring(center, r));
    return cells;
  }

  raycastTileLine(a, b) {
    return [];
  }
}
