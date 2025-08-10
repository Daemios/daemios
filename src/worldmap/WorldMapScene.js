import * as THREE from 'three';
import SceneController from '../3d/core/SceneController.js';
import HexGrid from '../3d/grids/HexGrid.js';
import HexNav from '../3d/nav/HexNav.js';

export default class WorldMapScene extends SceneController {
  constructor(opts = {}) {
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
    camera.position.set(0, 0, 10);
    camera.lookAt(0, 0, 0);
    super({ camera });
    this.grid = new HexGrid(opts.grid);
    this.nav = new HexNav(this.grid, opts.nav);
  }
}
