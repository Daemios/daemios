import { Scene, PerspectiveCamera, WebGLRenderer } from 'three'
import type { RenderPipeline } from './RenderPipeline'
import { AssetStore } from './Assets/AssetStore'
import type { Interactor } from './Interact/Interactor'
import type { Grid } from '../grids/Grid'
import type { Nav } from '../nav/Nav'

interface SceneControllerOptions {
  grid: Grid
  nav: Nav
  pipeline: RenderPipeline
  assets?: AssetStore
  interactor?: Interactor
}

export class SceneController {
  scene: Scene
  camera: PerspectiveCamera
  renderer!: WebGLRenderer
  grid: Grid
  nav: Nav
  pipeline: RenderPipeline
  assets: AssetStore
  interactor?: Interactor

  constructor(opts: SceneControllerOptions) {
    this.scene = new Scene()
    this.camera = new PerspectiveCamera()
    this.grid = opts.grid
    this.nav = opts.nav
    this.pipeline = opts.pipeline
    this.assets = opts.assets || new AssetStore()
    this.interactor = opts.interactor
  }

  init(container: HTMLElement) {
    this.renderer = this.pipeline.createRenderer()
    container.appendChild(this.renderer.domElement)
    this.pipeline.mount?.(this.scene, this.camera, this.renderer)
  }

  tick(dt: number) {
    this.pipeline.render(this.renderer, this.scene, this.camera, dt)
  }

  resize(width: number, height: number) {
    this.renderer.setSize(width, height)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
  }

  dispose() {
    this.pipeline.dispose?.()
    this.renderer.dispose()
    this.assets.clear()
  }
}
