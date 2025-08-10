import { SceneController } from '../3d/core/SceneController'
import { BasicPipeline } from '../3d/core/RenderPipeline'
import { HexGrid } from '../3d/grids/HexGrid'
import { HexNav } from '../3d/nav/HexNav'

export class WorldMapScene extends SceneController {
  constructor() {
    const grid = new HexGrid(1)
    const nav = new HexNav(grid)
    const pipeline = new BasicPipeline()
    super({ grid, nav, pipeline })
  }
}
