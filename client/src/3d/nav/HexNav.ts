import type { Vec2 } from '../core/types'
import { HexGrid } from '../grids/HexGrid'
import type { Nav } from './Nav'

function key(c: Vec2) {
  return `${c.x},${c.y}`
}

export class HexNav implements Nav {
  grid: HexGrid
  blockers = new Set<string>()

  constructor(grid: HexGrid) {
    this.grid = grid
  }

  setBlocker(coord: Vec2, blocked: boolean) {
    const k = key(coord)
    if (blocked) this.blockers.add(k)
    else this.blockers.delete(k)
  }

  cost() {
    return 1
  }

  pathfind(start: Vec2, goal: Vec2): Vec2[] {
    const frontier: Vec2[] = [start]
    const came = new Map<string, Vec2 | null>()
    came.set(key(start), null)
    while (frontier.length) {
      const current = frontier.shift() as Vec2
      if (key(current) === key(goal)) break
      for (const next of this.grid.neighbors(current)) {
        const k = key(next)
        if (this.blockers.has(k) || came.has(k)) continue
        frontier.push(next)
        came.set(k, current)
      }
    }
    const path: Vec2[] = []
    if (!came.has(key(goal))) return path
    let cur: Vec2 | null = goal
    while (cur) {
      path.unshift(cur)
      cur = came.get(key(cur)) || null
    }
    return path
  }
}
