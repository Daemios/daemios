import * as THREE from 'three';
import { createRendererManager } from '@/3d2/renderer/rendererManager';
import { WorldGrid } from '@/3d2/domain/grid/WorldGrid';
import { EntityPicker } from '@/3d2/interaction/EntityPicker';
// OrbitControls is a browser-only module; import dynamically when init runs to avoid SSR issues

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

    // add simple lighting for the debug scene
  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  const key = new THREE.DirectionalLight(0xffffff, 0.8);
    key.position.set(10, 20, 10);
    this.scene.add(ambient, key);

    // create a visible debug grid of hex-like markers (instanced) at startup
    this._gridRadius = 4; // default; scene API can expose setter later
    this._createGridInstances(this._gridRadius);

  // entity group for runtime markers
  this._entityGroup = new THREE.Group();
  this.scene.add(this._entityGroup);

  // interaction: use EntityPicker to manage raycast/hover/selection
  this._picker = new EntityPicker({
    camera: this.camera,
    getObjects: () => (this._entityGroup ? this._entityGroup.children : []),
    container: this.container,
  });

    // lazy load OrbitControls and wire controls to camera and renderer dom
    try {
      const dom = this.manager && this.manager.renderer && this.manager.renderer.domElement;
      if (dom) {
        // dynamic import keeps build light and avoids SSR/runtime require issues
        import('three/examples/jsm/controls/OrbitControls.js').then((mod) => {
          try {
            const OrbitControls = mod.OrbitControls || mod.default || mod;
            this._controls = new OrbitControls(this.camera, dom);
            this._controls.enableDamping = true;
            this._controls.dampingFactor = 0.1;
            this._controls.screenSpacePanning = false;
            this._controls.minDistance = 5;
            this._controls.maxDistance = 300;
          } catch (e) { /* ignore */ }
        }).catch(() => { /* ignore dynamic import failures */ });
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

  const geom = new THREE.CylinderGeometry(0.7, 0.7, 0.2, 6);
  const mat = new THREE.MeshLambertMaterial({ color: 0xeeeeee });
  const inst = new THREE.InstancedMesh(geom, mat, positions.length);
  inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    const dummy = new THREE.Object3D();
    for (let i = 0; i < positions.length; i++) {
      const p = positions[i];
      dummy.position.set(p.x, 0, p.z);
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
    }

    this.scene.add(inst);
    this._gridInstanced = inst;
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
