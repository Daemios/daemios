import * as THREE from 'three';

export default class SceneController {
  constructor({ renderer, camera } = {}) {
    this.scene = new THREE.Scene();
    this.renderer = renderer || new THREE.WebGLRenderer({ antialias: true });
    this.camera = camera || new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
    this._tickers = new Set();
    this._boundLoop = this._loop.bind(this);
    this._running = false;
  }

  mount(el) {
    this.el = el;
    el.appendChild(this.renderer.domElement);
    this.resize(el.clientWidth, el.clientHeight);
    this._running = true;
    requestAnimationFrame(this._boundLoop);
  }

  onTick(fn) {
    this._tickers.add(fn);
  }

  offTick(fn) {
    this._tickers.delete(fn);
  }

  _loop(time) {
    if (!this._running) return;
    this._tickers.forEach((fn) => fn(time));
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this._boundLoop);
  }

  resize(w, h) {
    this.renderer.setSize(w, h);
    if (this.camera.isPerspectiveCamera) {
      this.camera.aspect = w / h;
    }
    this.camera.updateProjectionMatrix();
  }

  dispose() {
    this._running = false;
    this.renderer.dispose();
  }
}
