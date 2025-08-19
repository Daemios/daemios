import * as THREE from 'three';
import { createRendererManager } from '@/3d2/renderer/rendererManager';
import { createInstancedMesh } from '@/3d2/renderer/instancing';
import { createComposer } from '@/3d2/renderer/composer';
import { WorldGrid } from '@/3d2/domain/grid/WorldGrid';
import { EntityPicker } from '@/3d2/interaction/EntityPicker';
import { createOrbitControls } from '@/3d2/interaction/orbitControls';
import ClutterManager from '@/3d2/world/ClutterManager';
import { loadHexModel } from '@/services/model/modelLoader';

export class WorldMapScene {
  constructor(container) {
    this.container = container || null;
    this.manager = null;
    this.scene = null;
    this.camera = null;
    this.grid = null;
  }

  init() {
  // attach optional orbit controls (lazy import to avoid bundling in SSR)
  this._controls = null;
  this.scene = new THREE.Scene();
  const width = this.container ? this.container.clientWidth : 800;
    const height = this.container ? this.container.clientHeight : 600;
    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
  this.camera.position.set(0, 50, 50);
  this.camera.lookAt(0, 0, 0);

    this.manager = createRendererManager({
      width,
      height,
      container: this.container,
      scene: this.scene,
      camera: this.camera,
    });

    // attempt to create a postprocessing composer; non-fatal if unavailable
    try {
      createComposer(this.manager.renderer, this.scene, this.camera).then((c) => {
        if (c) this.manager.composer = c;
      }).catch(() => { /* ignore */ });
    } catch (e) { /* ignore */ }

    // Ensure renderer DOM is visible and attached. Prefer container, otherwise fallback to body.
    try {
      const canvas = this.manager && this.manager.renderer && this.manager.renderer.domElement;
  // debug removed
      if (canvas) {
        // style to fill the wrapper
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.zIndex = '0';
        canvas.style.display = 'block';
        // attach explicitly to container if available
        if (this.container && this.container.appendChild) {
          // avoid double-append
          if (canvas.parentNode !== this.container) this.container.appendChild(canvas);
          // set renderer logical size to container size
          const cw = this.container.clientWidth || width;
          const ch = this.container.clientHeight || height;
          try {
            this.manager.renderer.setSize(cw, ch);
            if (this.manager.composer && this.manager.composer.setSize) this.manager.composer.setSize(cw, ch);
          } catch (e) {
            /* ignore */
          }
        } else {
          if (canvas.parentNode !== document.body) document.body.appendChild(canvas);
        }
        try {
          // make clear color visible for debug
          if (this.manager && this.manager.renderer && this.manager.renderer.setClearColor) {
            this.manager.renderer.setClearColor(0x223344, 1);
          }
        } catch (e) {
          /* ignore */
        }
      }
    } catch (e) {
      // ignore attach errors in production
    }

  this.grid = new WorldGrid(1);

    // simplified clutter manager for 3d2: attach to scene and generate a lightweight set
    try {
      this._clutter = new ClutterManager({
        types: [
          { id: 'grass', baseColor: 0x66aa66, density: 0.22, scale: { min: 0.5, max: 1.0 } },
        ],
        streamBudgetMs: 6,
        worldSeed: 1337,
      });
      this._clutter.addTo(this.scene);
      try { this._clutter.prepareFromGrid(this.grid); } catch (e) { /* ignore */ }
      try {
        // commit an initial region matching the grid radius
        this._clutter.commitInstances({ layoutRadius: 1, contactScale: 1, hexMaxY: 1, modelScaleY: () => 1, axialRect: { qMin: -this._gridRadius, qMax: this._gridRadius, rMin: -this._gridRadius, rMax: this._gridRadius } });
      } catch (e) {
        // ignore commit failures in simplified manager
      }
    } catch (e) {
      // ignore clutter manager init failures
    }

    // add simple lighting for the debug scene
  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  const key = new THREE.DirectionalLight(0xffffff, 0.8);
    key.position.set(10, 20, 10);
    this.scene.add(ambient, key);

    // create a visible debug grid of hex markers (instanced) at startup
    this._gridRadius = 4; // default; scene API can expose setter later
    // Try to load the project's hex model for visual parity; fall back to simple geometry
    (async () => {
      try {
        const model = await loadHexModel({ path: '/models/hex-can.glb', layoutRadius: 1, orientation: 'flat' });
        this._hexModel = model; // contains topGeom, sideGeom, modelScaleFactor, contactScale, hexMaxY
      } catch (e) {
        // model not available; continue with fallback
        this._hexModel = null;
      }
      this._createGridInstances(this._gridRadius);
    })();

  // entity group for runtime markers
  this._entityGroup = new THREE.Group();
  this.scene.add(this._entityGroup);

  // interaction: use EntityPicker to manage raycast/hover/selection
  this._picker = new EntityPicker({
    camera: this.camera,
    getObjects: () => (this._entityGroup ? this._entityGroup.children : []),
    container: this.container,
  });

    // create orbit controls via wrapper (dynamic import inside wrapper)
    try {
      const dom = this.manager && this.manager.renderer && this.manager.renderer.domElement;
      if (dom) {
        createOrbitControls(this.camera, dom, {
          enableDamping: true,
          dampingFactor: 0.1,
          screenSpacePanning: false,
          minDistance: 5,
          maxDistance: 300,
        }).then((controls) => {
          if (controls) this._controls = controls;
        }).catch(() => { /* ignore */ });
      }
    } catch (e) { /* ignore */ }

    // Add additional helpers to ensure something is visible
    try {
      const gridHelper = new THREE.GridHelper(40, 20, 0xff0000, 0x444444);
      this.scene.add(gridHelper);
      const axes = new THREE.AxesHelper(10);
      this.scene.add(axes);

      const boxGeom = new THREE.BoxGeometry(4, 4, 4);
      const boxMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, wireframe: true });
      const box = new THREE.Mesh(boxGeom, boxMat);
      box.position.set(0, 2, 0);
      this.scene.add(box);
    } catch (e) {
      // ignore helper failures
    }

  // no debug logs
  }

  // Create instanced markers for hex centers (flat-top axial layout -> x,z)
  _createGridInstances(radius) {
    const HEX_SIZE = 2.0;
    const positions = [];
    for (let q = -radius; q <= radius; q++) {
      for (let r = Math.max(-radius, -q - radius); r <= Math.min(radius, -q + radius); r++) {
        // flat-top axial to x,z
        const x = HEX_SIZE * 1.5 * q;
        const z = HEX_SIZE * Math.sqrt(3) * (r + q / 2);
        positions.push({ x, z });
      }
    }

    if (!positions.length) return;

    // If we have a loaded hex model, use its geometries for instanced rendering to match legacy visuals.
    if (this._hexModel && this._hexModel.topGeom) {
      const topGeom = this._hexModel.topGeom;
      const sideGeom = this._hexModel.sideGeom || topGeom;
      const mat = new THREE.MeshLambertMaterial({ color: 0xeeeeee });
      try {
        const topApi = createInstancedMesh(topGeom, mat, positions.length);
        const sideApi = createInstancedMesh(sideGeom, mat, positions.length);
        const topIM = topApi.instancedMesh;
        const sideIM = sideApi.instancedMesh;
        for (let i = 0; i < positions.length; i++) {
          const p = positions[i];
          topApi.setInstanceMatrix(i, { x: p.x, y: 0, z: p.z });
          sideApi.setInstanceMatrix(i, { x: p.x, y: 0, z: p.z });
        }
        this.scene.add(topIM);
        this.scene.add(sideIM);
        this._gridInstanced = topIM;
        this._gridInstancedApi = topApi;
      } catch (e) {
        // fallback to simple cylinder if instancing fails
        const geom = new THREE.CylinderGeometry(0.7, 0.7, 0.2, 6);
        const mat2 = new THREE.MeshLambertMaterial({ color: 0xeeeeee });
        const group = new THREE.Group();
        for (let i = 0; i < positions.length; i++) {
          const p = positions[i];
          const m = new THREE.Mesh(geom.clone(), mat2.clone());
          m.position.set(p.x, 0, p.z);
          group.add(m);
        }
        this.scene.add(group);
        this._gridInstanced = group;
      }
    } else {
      // No model loaded -> simple cylinder markers
      const geom = new THREE.CylinderGeometry(0.7, 0.7, 0.2, 6);
      const mat = new THREE.MeshLambertMaterial({ color: 0xeeeeee });
      try {
        const instanceApi = createInstancedMesh(geom, mat, positions.length);
        const inst = instanceApi.instancedMesh;
        for (let i = 0; i < positions.length; i++) {
          const p = positions[i];
          instanceApi.setInstanceMatrix(i, { x: p.x, y: 0, z: p.z });
        }
        this.scene.add(inst);
        this._gridInstanced = inst;
        this._gridInstancedApi = instanceApi;
      } catch (e) {
        // fallback to non-instanced mesh set in case helper fails
        const group = new THREE.Group();
        for (let i = 0; i < positions.length; i++) {
          const p = positions[i];
          const m = new THREE.Mesh(geom.clone(), mat.clone());
          m.position.set(p.x, 0, p.z);
          group.add(m);
        }
        this.scene.add(group);
        this._gridInstanced = group;
      }
    }
  }

  // update the grid radius (recreate instanced markers)
  setGridRadius(radius) {
    if (this._gridInstanced) {
      try { this.scene.remove(this._gridInstanced); } catch (e) { /* ignore */ }
      this._gridInstanced.geometry.dispose && this._gridInstanced.geometry.dispose();
      this._gridInstanced.material.dispose && this._gridInstanced.material.dispose();
      this._gridInstanced = null;
    }
    this._gridRadius = radius;
    this._createGridInstances(radius);
    // update clutter region to match new grid radius
    try {
      if (this._clutter) {
        try { this._clutter.prepareFromGrid(this.grid); } catch (e) { /* ignore */ }
        this._clutter.commitInstances({ layoutRadius: 1, contactScale: 1, hexMaxY: 1, modelScaleY: () => 1, axialRect: { qMin: -radius, qMax: radius, rMin: -radius, rMax: radius } });
      }
    } catch (e) {
      // ignore
    }
  }

  // show entity markers; entities: [{ type, pos: { q,r }, ... }]
  showEntities(entities) {
    // clear previous
    if (this._entityGroup) {
      while (this._entityGroup.children.length) {
        const c = this._entityGroup.children.pop();
        try {
          c.geometry && c.geometry.dispose && c.geometry.dispose();
        } catch (e) {
          // ignore dispose geometry errors
        }
        try {
          c.material && c.material.dispose && c.material.dispose();
        } catch (e) {
          // ignore dispose material errors
        }
      }
    }
    if (!Array.isArray(entities) || !entities.length) return;
    // create simple spheres
  // use imported THREE
    const geom = new THREE.SphereGeometry(0.6, 10, 10);
    for (let i = 0; i < entities.length; i++) {
      const e = entities[i];
      const q = e.pos && typeof e.pos.q === 'number' ? e.pos.q : 0;
      const r = e.pos && typeof e.pos.r === 'number' ? e.pos.r : 0;
      const HEX_SIZE = 2.0;
      const x = HEX_SIZE * 1.5 * q;
      const z = HEX_SIZE * Math.sqrt(3) * (r + q / 2);
      const mat = new THREE.MeshStandardMaterial({ color: 0x3388ff });
      const m = new THREE.Mesh(geom, mat);
      m.position.set(x, 0.6, z);
      // attach entity data for picking
      m.userData = { entity: e, index: i };
      this._entityGroup.add(m);
    }

    // ensure picker is attached to the renderer DOM
    try {
      const dom = this.manager && this.manager.renderer && this.manager.renderer.domElement;
      if (dom) this._picker.attach(dom);
    } catch (e) {
      /* ignore */
    }
  }

  // register a select callback
  setOnSelect(cb) {
  if (this._picker && typeof this._picker.setOnSelect === 'function') this._picker.setOnSelect(cb);
  }

  getSelected() {
  return this._picker ? this._picker.getSelected() : null;
  }

  // Interaction is handled by EntityPicker; no inline pointer methods remain.

  // cleanup on dispose: remove pointer listeners
  dispose() {
    try {
      if (this._picker) this._picker.detach();
    } catch (e) {
      // ignore
    }
    if (this.manager && this.manager.dispose) this.manager.dispose();
    try {
      if (this._clutter) {
        try { this._clutter.removeFrom(); } catch (e) { /* ignore */ }
        this._clutter = null;
      }
    } catch (e) {
      /* ignore */
    }
    this.scene = null;
    this.camera = null;
    this.manager = null;
  }

  tick() {
    if (this.manager) this.manager.render();
  }

  resize(w, h) {
    if (this.manager && this.manager.setSize) this.manager.setSize(w, h);
  }

  // Camera helpers
  centerOn(q, r) {
    // convert axial q,r to world x,z using the same HEX_SIZE used for rendering
    const HEX_SIZE = 2.0;
    const x = HEX_SIZE * 1.5 * (typeof q === 'number' ? q : 0);
    const z = HEX_SIZE * Math.sqrt(3) * ((typeof r === 'number' ? r : 0) + (typeof q === 'number' ? q : 0) / 2);
    if (this.camera) {
      this.camera.position.set(x, this.camera.position.y, z + 30);
      this.camera.lookAt(x, 0, z);
      if (this._controls && typeof this._controls.target !== 'undefined') {
        this._controls.target.set(x, 0, z);
        this._controls.update();
      }
    }
  }

  zoomTo(distance) {
    if (!this.camera) return;
    const d = typeof distance === 'number' ? distance : 50;
    // Move camera along its local Z axis relative to target (simple approach)
    if (this._controls && this._controls.target) {
      const t = this._controls.target;
      // set camera at target + vector back along world Z
      this.camera.position.set(t.x, t.y + d * 0.6, t.z + d);
      this._controls.update && this._controls.update();
    } else {
      this.camera.position.set(this.camera.position.x, d * 0.6, d);
    }
  }

  resetView() {
    if (this.camera) {
      this.camera.position.set(0, 50, 50);
      this.camera.lookAt(0, 0, 0);
      if (this._controls) {
        this._controls.target.set(0, 0, 0);
        this._controls.update();
      }
    }
  }

}

// ESM export used above; no CommonJS export in browser.
