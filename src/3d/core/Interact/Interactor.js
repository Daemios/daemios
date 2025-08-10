import * as THREE from 'three';

export default class Interactor {
  constructor(camera, grid) {
    this.camera = camera;
    this.grid = grid;
    this.raycaster = new THREE.Raycaster();
    this.handlers = {};
    this._onMove = this._onMove.bind(this);
    this._onClick = this._onClick.bind(this);
  }

  attach(dom) {
    this.dom = dom;
    dom.addEventListener('pointermove', this._onMove);
    dom.addEventListener('click', this._onClick);
  }

  detach() {
    if (!this.dom) return;
    this.dom.removeEventListener('pointermove', this._onMove);
    this.dom.removeEventListener('click', this._onClick);
  }

  on(type, fn) {
    this.handlers[type] = fn;
  }

  _project(event) {
    const rect = this.dom.getBoundingClientRect();
    const ndc = {
      x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
      y: -((event.clientY - rect.top) / rect.height) * 2 + 1,
    };
    this.raycaster.setFromCamera(ndc, this.camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const world = this.raycaster.ray.intersectPlane(plane, new THREE.Vector3());
    if (!world) return null;
    const coord = this.grid.toCoord({ x: world.x, y: world.y, z: world.z });
    return { world, coord };
  }

  _onMove(e) {
    const hit = this._project(e);
    if (hit && this.handlers.pointermove) this.handlers.pointermove(hit);
  }

  _onClick(e) {
    const hit = this._project(e);
    if (hit && this.handlers.click) this.handlers.click(hit);
  }
}
