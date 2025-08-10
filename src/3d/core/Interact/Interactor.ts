import type { Grid } from '../../grids/Grid'
import type { Vec3 } from '../types'

type IntentHandler = (intent: string, payload: any) => void

export class Interactor {
  grid: Grid
  dispatch: IntentHandler

  constructor(grid: Grid, dispatch: IntentHandler) {
    this.grid = grid
    this.dispatch = dispatch
  }

  pointer(world: Vec3) {
    const coord = this.grid.toCoord(world)
    this.dispatch('pointer', { coord })
  }
}
