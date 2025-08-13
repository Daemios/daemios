import { SceneController } from '../core/SceneController'
import { BasicPipeline } from '../core/RenderPipeline'
import { HexGrid } from '../grids/HexGrid'
import { HexNav } from '../nav/HexNav'

export class WorldMapScene extends SceneController {
  constructor() {
    const grid = new HexGrid(1)
    const nav = new HexNav(grid)
    const pipeline = new BasicPipeline()
    super({ grid, nav, pipeline })
  }
}
