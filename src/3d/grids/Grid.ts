import type { Vec2, Vec3 } from '../core/types'

export interface Grid {
  toWorld(coord: Vec2): Vec3
  toCoord(world: Vec3): Vec2
  neighbors(coord: Vec2): Vec2[]
  distance(a: Vec2, b: Vec2): number
  ring(center: Vec2, radius: number): Vec2[]
  spiral(center: Vec2, radius: number): Vec2[]
  raycastTileLine(a: Vec2, b: Vec2): Vec2[]
}
