import { SceneController } from '../core/SceneController'
import { BasicPipeline } from '../core/RenderPipeline'
import { SquareGrid } from '../grids/SquareGrid'
import { SquareNav } from '../nav/SquareNav'

export class ArenaScene extends SceneController {
  constructor() {
    const grid = new SquareGrid(1)
    const nav = new SquareNav(grid)
    const pipeline = new BasicPipeline()
    super({ grid, nav, pipeline })
  }
}
