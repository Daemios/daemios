import * as THREE from 'three';
import SceneController from '../3d/core/SceneController.js';
import SquareGrid from '../3d/grids/SquareGrid.js';
import SquareNav from '../3d/nav/SquareNav.js';
import Interactor from '../3d/core/Interact/Interactor.js';
import RenderPipeline from '../3d/core/RenderPipeline.js';

export default class ArenaScene extends SceneController {
  constructor(opts = {}) {
    const w = opts.width || 10;
    const h = opts.height || 10;
    const camera = new THREE.OrthographicCamera(0, w, 0, -h, 0.1, 1000);
    camera.position.set(0, 0, 10);
    camera.lookAt(0, 0, 0);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    const pipeline = new RenderPipeline({ renderer });
    super({ renderer: pipeline.getRenderer(), camera });
    this.pipeline = pipeline;
    this.grid = new SquareGrid();
    this.nav = new SquareNav(this.grid);
    this.interactor = new Interactor(this.camera, this.grid);
    this.width = w; this.height = h;
    this._highlight = null;
    this.onTick(() => this.pipeline.render(this.scene, this.camera));
  }

  init(container) {
    this.mount(container);
    this._buildTerrain();
    this.interactor.attach(this.renderer.domElement);
    this.interactor.on('pointermove', ({ coord }) => this._highlightCell(coord));
  }

  _buildTerrain() {
    const geom = new THREE.PlaneGeometry(1, 1);
    const mat = new THREE.MeshBasicMaterial({ color: 0x808080, side: THREE.DoubleSide });
    const count = this.width * this.height;
    const mesh = new THREE.InstancedMesh(geom, mat, count);
    let i = 0;
    for (let x = 0; x < this.width; x += 1) {
      for (let y = 0; y < this.height; y += 1) {
        const pos = this.grid.toWorld({ x, y });
        const mtx = new THREE.Matrix4().makeTranslation(pos.x, pos.y, 0);
        mesh.setMatrixAt(i, mtx);
        i += 1;
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    this.scene.add(mesh);
  }

  _highlightCell(coord) {
    if (!this._highlight) {
      const geom = new THREE.PlaneGeometry(1, 1);
      const mat = new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
      this._highlight = new THREE.Mesh(geom, mat);
      this.scene.add(this._highlight);
    }
    const pos = this.grid.toWorld(coord);
    this._highlight.position.set(pos.x, pos.y, 0.01);
  }
}
