import { SceneController } from '../3d/core/SceneController'
import { BasicPipeline } from '../3d/core/RenderPipeline'
import { SquareGrid } from '../3d/grids/SquareGrid'
import { SquareNav } from '../3d/nav/SquareNav'

export class ArenaScene extends SceneController {
  constructor() {
    const grid = new SquareGrid(1)
    const nav = new SquareNav(grid)
    const pipeline = new BasicPipeline()
    super({ grid, nav, pipeline })
  }
}
