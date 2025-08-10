import * as THREE from 'three';

export default class RenderPipeline {
  constructor(opts = {}) {
    this.renderer = opts.renderer || new THREE.WebGLRenderer({ antialias: true });
    this.passes = [];
    this.cullFn = null;
  }

  getRenderer() {
    return this.renderer;
  }

  addPass(pass) {
    this.passes.push(pass);
  }

  setCulling(fn) {
    this.cullFn = fn;
  }

  render(scene, camera) {
    if (this.cullFn) {
      scene.children.forEach((obj) => {
        obj.visible = this.cullFn(obj);
      });
    }
    this.renderer.render(scene, camera);
    this.passes.forEach((p) => p.render?.());
  }
}
