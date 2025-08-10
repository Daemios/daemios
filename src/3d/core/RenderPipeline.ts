import { WebGLRenderer, Scene, Camera } from 'three'

export interface RenderPipeline {
  createRenderer(): WebGLRenderer
  render(renderer: WebGLRenderer, scene: Scene, camera: Camera, dt: number): void
  mount?(scene: Scene, camera: Camera, renderer: WebGLRenderer): void
  dispose?(): void
}

export class BasicPipeline implements RenderPipeline {
  createRenderer() {
    const r = new WebGLRenderer({ antialias: true })
    r.setPixelRatio(globalThis.devicePixelRatio || 1)
    return r
  }

  render(renderer: WebGLRenderer, scene: Scene, camera: Camera) {
    renderer.render(scene, camera)
  }
}
