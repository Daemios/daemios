import type { Vec2, Vec3 } from '../core/types'
import type { Grid } from './Grid'

export class SquareGrid implements Grid {
  size: number

  constructor(size = 1) {
    this.size = size
  }

  toWorld({ x, y }: Vec2): Vec3 {
    return { x: x * this.size, y: 0, z: y * this.size }
  }

  toCoord({ x, z }: Vec3): Vec2 {
    return { x: Math.round(x / this.size), y: Math.round(z / this.size) }
  }

  neighbors(c: Vec2): Vec2[] {
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]
    return dirs.map((d) => ({ x: c.x + d[0], y: c.y + d[1] }))
  }

  distance(a: Vec2, b: Vec2): number {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
  }

  ring(center: Vec2, radius: number): Vec2[] {
    const res: Vec2[] = []
    for (let x = -radius; x <= radius; x++) res.push({ x: center.x + x, y: center.y - radius })
    for (let y = -radius + 1; y < radius; y++) res.push({ x: center.x + radius, y: center.y + y })
    for (let x = radius; x >= -radius; x--) res.push({ x: center.x + x, y: center.y + radius })
    for (let y = radius - 1; y > -radius; y--) res.push({ x: center.x - radius, y: center.y + y })
    return res
  }

  spiral(center: Vec2, radius: number): Vec2[] {
    let res: Vec2[] = [center]
    for (let r = 1; r <= radius; r++) res = res.concat(this.ring(center, r))
    return res
  }

  raycastTileLine(a: Vec2, b: Vec2): Vec2[] {
    const res: Vec2[] = []
    let x = a.x
    let y = a.y
    const dx = Math.abs(b.x - a.x)
    const dy = Math.abs(b.y - a.y)
    const n = 1 + dx + dy
    const xInc = b.x > a.x ? 1 : -1
    const yInc = b.y > a.y ? 1 : -1
    let error = dx - dy
    let dx2 = dx * 2
    let dy2 = dy * 2
    for (let i = 0; i < n; i++) {
      res.push({ x, y })
      if (error > 0) {
        x += xInc
        error -= dy2
      } else if (error < 0) {
        y += yInc
        error += dx2
      } else {
        x += xInc
        y += yInc
        error += dx2 - dy2
      }
    }
    return res
  }
}
