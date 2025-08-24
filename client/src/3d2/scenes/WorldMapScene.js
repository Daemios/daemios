import * as THREE from 'three';
import { createRendererManager } from '@/3d2/renderer/rendererManager';
import { createInstancedMesh, setInstanceColors } from '@/3d2/renderer/instancing';
import { createComposer } from '@/3d2/renderer/composer';
import { WorldGrid } from '@/3d2/domain/grid/WorldGrid';
import { createWorldGenerator } from '@/3d2/domain/world';
import { biomeFromCell } from '@/3d2/domain/world/biomes';
import { axialToXZ, XZToAxial } from '@/3d2/renderer/coordinates';
import { BASE_HEX_SIZE } from '@/3d2/config/layout';
import { EntityPicker } from '@/3d2/interaction/EntityPicker';
import { createOrbitControls } from '@/3d2/interaction/orbitControls';
import ClutterManager from '@/3d2/world/ClutterManager';
import { loadHexModel } from '@/3d2/services/modelLoader';
import { createChunkManager } from '@/3d2/renderer/ChunkManager';
import { pastelColorForChunk } from '@/3d/utils/hexUtils';
import { profiler } from '@/utils/profiler';

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
      }).catch((err) => { console.debug('WorldMapScene: createComposer promise failed', err); });
    } catch (e) { console.debug('WorldMapScene: createComposer failed', e); }

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
            console.debug('WorldMapScene: renderer.setSize/setComposer failed', e);
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
          console.debug('WorldMapScene: setClearColor failed', e);
        }
      }
    } catch (e) {
      // ignore attach errors in production, but log for debug
      console.debug('WorldMapScene: attach canvas failed', e);
    }

    this.grid = new WorldGrid(1);
    // create a world generator early so renderers can sample cell data
    try {
      this._generatorSeed = 1337;
      this._generator = createWorldGenerator('hex', this._generatorSeed);
    } catch (e) {
      console.debug('WorldMapScene: createWorldGenerator failed', e);
      this._generator = null;
      this._generatorSeed = null;
    }

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
  try { this._clutter.prepareFromGrid(this.grid); } catch (e) { console.debug('WorldMapScene: clutter.prepareFromGrid failed', e); }
      try {
        // commit an initial region matching the grid radius
  this._clutter.commitInstances({ layoutRadius: this._layoutRadius || 1, contactScale: 0.6, hexMaxY: 1, modelScaleY: () => 1, axialRect: { qMin: -this._gridRadius, qMax: this._gridRadius, rMin: -this._gridRadius, rMax: this._gridRadius } });
      } catch (e) {
        console.debug('WorldMapScene: clutter.commitInstances failed', e);
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
        this._hexModel = model; // contains topGeom, sideGeom, modelScaleFactor, contactScale, hexMaxY, nativeRadius
        // set a scene-wide layout radius derived from the model's native radius so tiles touch
  // layoutRadius is a unitless multiplier applied to BASE_HEX_SIZE; compute so hexSize == model.nativeRadius
        this._layoutRadius = (model.nativeRadius && BASE_HEX_SIZE) ? (model.nativeRadius / BASE_HEX_SIZE) : 1;
        // debug: print measured dims and derived spacing
        try {
          const hexSize = BASE_HEX_SIZE * this._layoutRadius;
          const pos0 = axialToXZ(0, 0, { layoutRadius: this._layoutRadius, spacingFactor: 1 });
          const pos1 = axialToXZ(1, 0, { layoutRadius: this._layoutRadius, spacingFactor: 1 });
          console.debug('WorldMapScene: hex dims', { nativeRadius: model.nativeRadius, baseHex: BASE_HEX_SIZE, layoutRadius: this._layoutRadius, hexSize, centerSpacing: Math.hypot(pos1.x - pos0.x, pos1.z - pos0.z) });
        } catch (e) { /* ignore */ }
      } catch (e) {
        // model not available; continue with fallback
        this._hexModel = null;
        this._layoutRadius = 1;
      }
      // create a chunk manager for chunk-based rendering and delegate instance creation
      // omit explicit chunkCols/chunkRows so ChunkManager can use its defaults
      try {
  this.chunkManager = createChunkManager({ scene: this.scene, generator: this._generator, layoutRadius: this._layoutRadius, spacingFactor: 1, neighborRadius: this._gridRadius, pastelColorForChunk });
        try {
          const built = await this.chunkManager.build(this._hexModel && this._hexModel.topGeom, this._hexModel && this._hexModel.sideGeom);
          // expose neighborhood's top instanced mesh for compatibility
          if (built && built.neighborhood && built.neighborhood.topIM) {
            // if a legacy grid instanced object exists, remove it to avoid duplicate geometry
            try {
              if (this._gridInstanced && this._gridInstanced !== built.neighborhood.topIM) {
                try { this.scene.remove(this._gridInstanced); } catch (e2) { /* ignore */ }
                try { this._gridInstanced.geometry && this._gridInstanced.geometry.dispose && this._gridInstanced.geometry.dispose(); } catch (e2) { /* ignore */ }
                try { this._gridInstanced.material && this._gridInstanced.material.dispose && this._gridInstanced.material.dispose(); } catch (e2) { /* ignore */ }
              }
            } catch (cleanupErr) { console.debug('WorldMapScene: cleanup previous grid instances failed', cleanupErr); }
            this._gridInstanced = built.neighborhood.topIM;
          }
          this._gridInstancedApi = this.chunkManager;
          console.debug('WorldMapScene: chunkManager build succeeded', { neighborhoodCount: built && built.count });
        } catch (e) {
          // fallback to legacy instanced creation
          console.debug('WorldMapScene: chunkManager build failed, falling back to legacy grid instances', e);
          this._createGridInstances(this._gridRadius);
        }
      } catch (e) {
        // chunk manager creation failed -> fallback
        console.debug('WorldMapScene: chunkManager creation failed, falling back', e);
        this._createGridInstances(this._gridRadius);
      }
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
        }).catch((err) => { console.debug('WorldMapScene: createOrbitControls promise failed', err); });
      }
    } catch (e) { console.debug('WorldMapScene: createOrbitControls failed', e); }

    // Debug helpers removed: grid, axes, and center box were useful during development
    // but are not wanted in production scenes. Keep the try/catch in place so
    // adding temporary helpers back is simple during debugging.
    try {
      // debug helpers intentionally removed
    } catch (e) {
      console.debug('WorldMapScene: helper setup failed', e);
    }

  // no debug logs
  }

  // Replace the current generator config. cfg is forwarded as the shared
  // generator's cfgPartial (controls layers.enabled and tunables). This will
  // recreate the generator and trigger a rebuild of chunk neighborhood so new
  // layer toggles take effect immediately.
  async setGeneratorConfig(cfg = {}) {
    try {
      const seed = this._generatorSeed != null ? this._generatorSeed : 1337;
      this._generator = createWorldGenerator('hex', seed, cfg);
      // rebuild chunk neighborhood if manager present so instances reflect new tiles
      if (this.chunkManager && typeof this.chunkManager.build === 'function') {
        try {
          await this.chunkManager.build(this._hexModel && this._hexModel.topGeom, this._hexModel && this._hexModel.sideGeom);
        } catch (e) {
          // bubbling rebuild failed; ignore
        }
      }
      // commit clutter if supported so clutter reflects new generator
      try {
        if (this.commitClutterForNeighborhood) this.commitClutterForNeighborhood();
        if (this.chunkManager && typeof this.chunkManager.commitClutterForNeighborhood === 'function') this.chunkManager.commitClutterForNeighborhood();
      } catch (e) {
        // ignore
      }
    } catch (e) {
      console.debug('WorldMapScene: setGeneratorConfig failed', e);
    }
  }

  // Create instanced markers for hex centers (flat-top axial layout -> x,z)
  _createGridInstances(radius) {
  // Root-cause protection: if a ChunkManager is active, do not create the
  // legacy grid instances. This prevents duplicate clusters when both
  // systems run (was causing stray small patches of cells).
  if (this.chunkManager) return;
  const positions = [];
    for (let q = -radius; q <= radius; q++) {
      for (let r = Math.max(-radius, -q - radius); r <= Math.min(radius, -q + radius); r++) {
    // flat-top axial to x,z using model-derived layoutRadius so tiles align with geometry
    const pos = axialToXZ(q, r, { layoutRadius: this._layoutRadius || 1, spacingFactor: 1 });
    const axial = XZToAxial(pos.x, pos.z, { layoutRadius: this._layoutRadius || 1, spacingFactor: 1 });
    positions.push({ x: pos.x, z: pos.z, q: axial.q, r: axial.r });
      }
    }

    if (!positions.length) return;

    // create or reuse a generator for sampling cell fields so we can color/scale instances
    // Reuse the scene-level generator if present to avoid repeated construction.
    let gen = this._generator || null;
    if (!gen) {
      try {
        gen = createWorldGenerator('hex', 1337);
        // Cache for potential reuse later
        this._generator = gen;
      } catch (e) {
        console.debug('WorldMapScene: createWorldGenerator failed, proceeding without generator', e);
        gen = null;
      }
    }

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
        // prepare color arrays for per-instance coloring
        const topColors = new Float32Array(positions.length * 3);
        const sideColors = new Float32Array(positions.length * 3);
        for (let i = 0; i < positions.length; i++) {
          const p = positions[i];
          // default scale and color
        let yScale = 1.0; // Default yScale
          let topCol = new THREE.Color(0xeeeeee);
          let sideCol = new THREE.Color(0xcccccc);
          try {
            if (gen) {
              let cell;
              if (typeof gen.getByXZ === 'function') cell = gen.getByXZ(p.x, p.z);
              else if (typeof gen.get === 'function') {
                const a = XZToAxial(p.x, p.z, { layoutRadius: this._layoutRadius || 1, spacingFactor: 1 });
                cell = gen.get(a.q, a.r);
              }
              // derive elevation from the canonical tile shape first, fall back to legacy fields.h
              let elev = 0;
              if (cell && typeof cell.height === 'number') elev = cell.height;
          else if (cell && cell.elevation && typeof cell.elevation.normalized === 'number') elev = cell.elevation.normalized;
          yScale = Math.max(0.001, elev * 1.0);
          // biomeFromCell accepts tile-shaped cells (height/elevation) or legacy fields
          const bio = biomeFromCell(cell);
              topCol = new THREE.Color(bio && bio.top ? bio.top : 0xeeeeee);
              sideCol = new THREE.Color(bio && bio.side ? bio.side : 0xcccccc);
            }
          } catch (e) {
            console.debug('WorldMapScene: sampling generator for top/side failed', e);
          }
          // set instance matrix with vertical scale
          topApi.setInstanceMatrix(i, { x: p.x, y: 0, z: p.z }, { x: 0, y: 0, z: 0 }, { x: 1.0, y: yScale, z: 1.0 });
          sideApi.setInstanceMatrix(i, { x: p.x, y: 0, z: p.z }, { x: 0, y: 0, z: 0 }, { x: 1.0, y: yScale, z: 1.0 });
          // write colors
          topColors[i * 3 + 0] = topCol.r;
          topColors[i * 3 + 1] = topCol.g;
          topColors[i * 3 + 2] = topCol.b;
          sideColors[i * 3 + 0] = sideCol.r;
          sideColors[i * 3 + 1] = sideCol.g;
          sideColors[i * 3 + 2] = sideCol.b;
        }
        // attach instanceColor attributes where supported
        try {
          setInstanceColors(topIM, topColors);
          setInstanceColors(sideIM, sideColors);
        } catch (e) {
          // fallback: tint material per mesh if instance colors not supported
          try { topIM.material.color.setHex(0xeeeeee); sideIM.material.color.setHex(0xcccccc); } catch (ee) { console.debug('WorldMapScene: fallback tint failed', ee); }
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
        const colors = new Float32Array(positions.length * 3);
        for (let i = 0; i < positions.length; i++) {
          const p = positions[i];
          let yScale = 1.0;
          let col = new THREE.Color(0xeeeeee);
          try {
            if (gen) {
              let cell;
              if (typeof gen.getByXZ === 'function') cell = gen.getByXZ(p.x, p.z);
              else if (typeof gen.get === 'function') {
                const a = XZToAxial(p.x, p.z, { layoutRadius: this._layoutRadius || 1, spacingFactor: 1 });
                cell = gen.get(a.q, a.r);
              }
              // prefer tile.height / elevation.normalized
              let elev = 0;
              if (cell && typeof cell.height === 'number') elev = cell.height;
          else if (cell && cell.elevation && typeof cell.elevation.normalized === 'number') elev = cell.elevation.normalized;
          yScale = Math.max(0.001, elev * 1.0);
          const bio = biomeFromCell(cell);
              col = new THREE.Color(bio && bio.top ? bio.top : 0xeeeeee);
            }
          } catch (e) { console.debug('WorldMapScene: sampling generator for cylinder failed', e); }
          instanceApi.setInstanceMatrix(i, { x: p.x, y: 0, z: p.z }, { x: 0, y: 0, z: 0 }, { x: 1.0, y: yScale, z: 1.0 });
          colors[i * 3 + 0] = col.r;
          colors[i * 3 + 1] = col.g;
          colors[i * 3 + 2] = col.b;
        }
  try { setInstanceColors(inst, colors); } catch (e) { console.debug('WorldMapScene: set instance color failed', e); }
        this.scene.add(inst);
        this._gridInstanced = inst;
        this._gridInstancedApi = instanceApi;
      } catch (e) {
        console.debug('WorldMapScene: instancing creation failed, falling back to group', e);
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
    // prefer chunkManager if available
    try {
      if (this.chunkManager) {
        // neighborRadius in chunkManager is the number of chunks around center
        this.chunkManager.neighborRadius = radius;
        try {
          const built = this.chunkManager.build(this._hexModel && this._hexModel.topGeom, this._hexModel && this._hexModel.sideGeom);
          // build may be async; ensure _gridInstanced points to neighborhood after promise
          if (built && built.then) {
            built.then((res) => {
              if (res && res.neighborhood && res.neighborhood.topIM) {
                try {
                  if (this._gridInstanced && this._gridInstanced !== res.neighborhood.topIM) {
                    try { this.scene.remove(this._gridInstanced); } catch (e2) { /* ignore */ }
                    try { this._gridInstanced.geometry && this._gridInstanced.geometry.dispose && this._gridInstanced.geometry.dispose(); } catch (e2) { /* ignore */ }
                    try { this._gridInstanced.material && this._gridInstanced.material.dispose && this._gridInstanced.material.dispose(); } catch (e2) { /* ignore */ }
                  }
                } catch (cleanupErr) { console.debug('WorldMapScene: cleanup previous grid instances failed', cleanupErr); }
                this._gridInstanced = res.neighborhood.topIM;
              }
            }).catch(() => {});
          } else if (built && built.neighborhood && built.neighborhood.topIM) {
            try {
              if (this._gridInstanced && this._gridInstanced !== built.neighborhood.topIM) {
                try { this.scene.remove(this._gridInstanced); } catch (e2) { /* ignore */ }
                try { this._gridInstanced.geometry && this._gridInstanced.geometry.dispose && this._gridInstanced.geometry.dispose(); } catch (e2) { /* ignore */ }
                try { this._gridInstanced.material && this._gridInstanced.material.dispose && this._gridInstanced.material.dispose(); } catch (e2) { /* ignore */ }
              }
            } catch (cleanupErr) { console.debug('WorldMapScene: cleanup previous grid instances failed', cleanupErr); }
            this._gridInstanced = built.neighborhood.topIM;
          }
        } catch (e) {
          // fallback to recreate legacy grid instances
          if (this._gridInstanced) {
            try { this.scene.remove(this._gridInstanced); } catch (ee) { /* ignore */ }
            this._gridInstanced = null;
          }
          this._gridRadius = radius;
          this._createGridInstances(radius);
        }
        // update clutter region below
      } else {
        if (this._gridInstanced) {
          try { this.scene.remove(this._gridInstanced); } catch (e) { console.debug('WorldMapScene: remove previous instanced failed', e); }
          this._gridInstanced.geometry.dispose && this._gridInstanced.geometry.dispose();
          this._gridInstanced.material.dispose && this._gridInstanced.material.dispose();
          this._gridInstanced = null;
        }
        this._gridRadius = radius;
        this._createGridInstances(radius);
      }
    } catch (e) {
      console.debug('WorldMapScene: setGridRadius failed', e);
    }
    // update clutter region to match new grid radius
    // update clutter region to match new grid radius
    try {
      if (this._clutter) {
        try { this._clutter.prepareFromGrid(this.grid); } catch (e) { console.debug('WorldMapScene: clutter.prepareFromGrid failed (setGridRadius)', e); }
        // if chunkManager exists compute axialRect based on chunk extents
        if (this.chunkManager) {
          const cols = this.chunkManager.chunkCols || 8;
          const rows = this.chunkManager.chunkRows || 8;
          const nr = this.chunkManager.neighborRadius || 1;
          const cx = this.chunkManager.centerChunk ? this.chunkManager.centerChunk.x : 0;
          const cy = this.chunkManager.centerChunk ? this.chunkManager.centerChunk.y : 0;
          const rect = {
            qMin: (cx - nr) * cols,
            qMax: (cx + nr) * cols + (cols - 1),
            rMin: (cy - nr) * rows,
            rMax: (cy + nr) * rows + (rows - 1),
          };
          this._clutter.commitInstances({ layoutRadius: this._layoutRadius || 1, contactScale: 0.6, hexMaxY: 1, modelScaleY: () => 1, axialRect: rect });
        } else {
          this._clutter.commitInstances({ layoutRadius: this._layoutRadius || 1, contactScale: 0.6, hexMaxY: 1, modelScaleY: () => 1, axialRect: { qMin: -radius, qMax: radius, rMin: -radius, rMax: radius } });
        }
      }
    } catch (e) {
      console.debug('WorldMapScene: setGridRadius clutter update failed', e);
    }
  }

  // allow external callers to toggle chunk coloring if a chunk manager or neighborhood exists
  applyChunkColors(enabled) {
    try {
      if (this.chunkManager && typeof this.chunkManager.applyChunkColors === 'function') {
        this.chunkManager.applyChunkColors(enabled);
        return;
      }
      if (this._gridInstanced && this._gridInstanced.material) {
        try { this._gridInstanced.material.color.setHex(enabled ? 0xffdddd : 0xeeeeee); } catch (e) { /* ignore */ }
      }
    } catch (e) {
      console.debug('WorldMapScene: applyChunkColors failed', e);
    }
  }

  // wrapper to request clutter commit for the current visible neighborhood
  commitClutterForNeighborhood() {
    try {
      if (this.chunkManager && typeof this.chunkManager.commitClutterForNeighborhood === 'function') {
        this.chunkManager.commitClutterForNeighborhood();
        return;
      }
      // fallback to view-level commit helper
      if (typeof this.commitClutterForNeighborhood === 'function') {
        try { this.commitClutterForNeighborhood(); } catch (e) { /* ignore */ }
      }
    } catch (e) {
      console.debug('WorldMapScene: commitClutterForNeighborhood failed', e);
    }
  }

  // show entity markers; entities: [{ type, pos: { x,z }, ... }]
  showEntities(entities) {
    // clear previous
    if (this._entityGroup) {
      while (this._entityGroup.children.length) {
        const c = this._entityGroup.children.pop();
        try {
          c.geometry && c.geometry.dispose && c.geometry.dispose();
        } catch (e) {
          console.debug('WorldMapScene: dispose geometry failed', e);
        }
        try {
          c.material && c.material.dispose && c.material.dispose();
        } catch (e) {
          console.debug('WorldMapScene: dispose material failed', e);
        }
      }
    }
    if (!Array.isArray(entities) || !entities.length) return;
    // create simple spheres
  // use imported THREE
    const geom = new THREE.SphereGeometry(0.6, 10, 10);
    for (let i = 0; i < entities.length; i++) {
      const e = entities[i];
      const x = e.pos && typeof e.pos.x === 'number' ? e.pos.x : 0;
      const z = e.pos && typeof e.pos.z === 'number' ? e.pos.z : 0;
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
      console.debug('WorldMapScene: picker attach failed', e);
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
      console.debug('WorldMapScene: picker detach failed', e);
    }
    if (this.manager && this.manager.dispose) this.manager.dispose();
    try {
      if (this._clutter) {
        try { this._clutter.removeFrom(); } catch (e) { console.debug('WorldMapScene: clutter.removeFrom failed', e); }
        this._clutter = null;
      }
    } catch (e) {
      console.debug('WorldMapScene: dispose clutter failed', e);
    }
    this.scene = null;
    this.camera = null;
    this.manager = null;
  }

  tick() {
    try {
      // Start frame profiling (CPU) and enqueue GPU timer if available.
      profiler.beginFrame();
      if (this.manager) {
        try {
          // start GPU timer if supported and enabled
          if (profiler.isGPUEnabled && profiler.isGPUEnabled()) {
            const g = profiler._gpu || null;
            if (g && typeof g.begin === 'function') g.begin();
          }
        } catch (e) {}

        profiler.start('frame.render');
        this.manager.render();
        profiler.end('frame.render');

        try {
          // end GPU timer so it can be polled by profiler.endFrame (only if enabled)
          if (profiler.isGPUEnabled && profiler.isGPUEnabled()) {
            const g2 = profiler._gpu || null;
            if (g2 && typeof g2.end === 'function') g2.end();
          }
        } catch (e) {}
      }
      profiler.endFrame();
    } catch (e) {
      // swallow to keep the render loop alive
    }
  }

  resize(w, h) {
    if (this.manager && this.manager.setSize) this.manager.setSize(w, h);
  }

  // Camera helpers
  centerOn(q, r) {
  // convert axial q,r to world x,z using centralized layout helper
  const { x, z } = axialToXZ(typeof q === 'number' ? q : 0, typeof r === 'number' ? r : 0, { layoutRadius: this._layoutRadius || 1, spacingFactor: 1 });
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
