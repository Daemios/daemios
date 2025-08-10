import type { Vec2 } from '../core/types'

export interface Nav {
  pathfind(start: Vec2, goal: Vec2): Vec2[]
  cost(from: Vec2, to: Vec2): number
  setBlocker(coord: Vec2, blocked: boolean): void
}
