import type { Vec2, Vec3 } from '../core/types'
import type { Grid } from './Grid'

function hexLerp(a: Vec2, b: Vec2, t: number): Vec2 {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
}

function hexRound(h: Vec2): Vec2 {
  let x = h.x
  let y = h.y
  let z = -x - y
  let rx = Math.round(x)
  let ry = Math.round(y)
  let rz = Math.round(z)
  const xDiff = Math.abs(rx - x)
  const yDiff = Math.abs(ry - y)
  const zDiff = Math.abs(rz - z)
  if (xDiff > yDiff && xDiff > zDiff) {
    rx = -ry - rz
  } else if (yDiff > zDiff) {
    ry = -rx - rz
  } else {
    rz = -rx - ry
  }
  return { x: rx, y: ry }
}

export class HexGrid implements Grid {
  size: number

  constructor(size = 1) {
    this.size = size
  }

  toWorld({ x, y }: Vec2): Vec3 {
    const worldX = this.size * (Math.sqrt(3) * x + (Math.sqrt(3) / 2) * y)
    const worldZ = this.size * (3 / 2) * y
    return { x: worldX, y: 0, z: worldZ }
  }

  toCoord({ x, z }: Vec3): Vec2 {
    const q = (Math.sqrt(3) / 3 * x - 1 / 3 * z) / this.size
    const r = (2 / 3 * z) / this.size
    return hexRound({ x: q, y: r })
  }

  neighbors(c: Vec2): Vec2[] {
    const dirs = [
      [1, 0],
      [1, -1],
      [0, -1],
      [-1, 0],
      [-1, 1],
      [0, 1],
    ]
    return dirs.map((d) => ({ x: c.x + d[0], y: c.y + d[1] }))
  }

  distance(a: Vec2, b: Vec2): number {
    const dx = a.x - b.x
    const dy = a.y - b.y
    const dz = -a.x - a.y - (-b.x - b.y)
    return (Math.abs(dx) + Math.abs(dy) + Math.abs(dz)) / 2
  }

  ring(center: Vec2, radius: number): Vec2[] {
    if (radius === 0) return [center]
    const results: Vec2[] = []
    const dirs = this.neighbors({ x: 0, y: 0 })
    let cube = { x: center.x + dirs[4].x * radius, y: center.y + dirs[4].y * radius }
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < radius; j++) {
        results.push({ x: cube.x, y: cube.y })
        cube.x += dirs[i].x
        cube.y += dirs[i].y
      }
    }
    return results
  }

  spiral(center: Vec2, radius: number): Vec2[] {
    let results: Vec2[] = [center]
    for (let k = 1; k <= radius; k++) {
      results = results.concat(this.ring(center, k))
    }
    return results
  }

  raycastTileLine(a: Vec2, b: Vec2): Vec2[] {
    const N = this.distance(a, b)
    const results: Vec2[] = []
    for (let i = 0; i <= N; i++) {
      results.push(hexRound(hexLerp(a, b, i / N)))
    }
    return results
  }
}
