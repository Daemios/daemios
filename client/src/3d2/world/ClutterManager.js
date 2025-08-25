import * as THREE from 'three';
import { createInstancedMesh } from '@/3d2/renderer/instancing';
import { ensureInstanceCapacity } from '@/3d/renderer/instancingUtils';

// Lightweight ClutterManager for 3d2. Intentionally simplified: it
// provides the same external API surface the scenes expect but avoids
// heavy GLTF loading and complex streaming. It's suitable for a visual
// parity demo and incremental migration.

export default class ClutterManager {
  constructor(options = {}) {
    this.enabled = options.enabled ?? true;
    this.streamBudgetMs = options.streamBudgetMs ?? 8;
    this.scene = null;
    this.world = null;
    this.types = options.types || []; // expected array of type defs { id, baseColor, desiredRadius }
    this.assets = new Map(); // id -> { geom, material }
    this.pools = new Map(); // id -> { api, count }
    this._shadowsEnabled = false;
    this._fade = { enabled: false, center: new THREE.Vector2(0, 0), radius: 0, corner: 0.5, cullWholeHex: true };
    this.worldSeed = options.worldSeed || 1337;
  }

  addTo(scene) {
    this.scene = scene;
    this._ensurePools();
    this._attachPools();
  }

  removeFrom() {
    this._detachPools();
    this.scene = null;
  }

  // No-op asset loader for simplified manager. Returns resolved Promise for parity.
  async loadAssets() {
    // Create a trivial geometry/material per type if none provided
    for (const t of this.types) {
      if (!this.assets.has(t.id)) {
        const g = t.geom || new THREE.CylinderGeometry(0.5, 0.5, 0.2, 6);
        const m = t.material || new THREE.MeshLambertMaterial({ color: t.baseColor ?? 0x88cc88 });
        this.assets.set(t.id, { geom: g, material: m });
      }
    }
    return Promise.resolve();
  }

  _ensurePools() {
    if (!this.scene) return;
    for (const t of this.types) {
      if (this.pools.has(t.id)) continue;
      const asset = this.assets.get(t.id) || {};
      const geom = asset.geom || new THREE.BoxGeometry(1, 1, 1);
      const mat = asset.material || new THREE.MeshLambertMaterial({ color: 0xffffff });
  const api = createInstancedMesh(geom, mat, 1);
  ensureInstanceCapacity(api.instancedMesh, 0);
      api.instancedMesh.visible = this.enabled;
      this.pools.set(t.id, { api, count: 0 });
    }
  }

  _attachPools() {
    if (!this.scene) return;
    for (const [, p] of this.pools) {
      if (!p.api.instancedMesh.parent) this.scene.add(p.api.instancedMesh);
    }
  }

  _detachPools() {
    for (const [, p] of this.pools) {
      if (p.api && p.api.instancedMesh && p.api.instancedMesh.parent) p.api.instancedMesh.parent.remove(p.api.instancedMesh);
    }
  }

  prepareFromGrid(worldGrid) {
    this.world = worldGrid;
  }

  // Simplified commitInstances: synchronously generate placements for cellRect or world bounds.
  commitInstances({ layoutRadius = 1, contactScale = 0.6, hexMaxY = 1, modelScaleY = () => 1, filter = null, offsetRect = null, cellRect = null } = {}) {
    if (!this.scene || !this.world) return;
    // Build a small sample of placements per type using a deterministic RNG derived from worldSeed
    const placements = new Map();
    for (const t of this.types) placements.set(t.id, []);

    const bounds = this.world.bounds ? this.world.bounds() : { minX: -1, maxX: 1, minZ: -1, maxZ: 1 };
    // support either offsetRect or cellRect; prefer cellRect if provided
    const xMin = cellRect?.xMin ?? (offsetRect?.colMin ?? bounds.minX);
    const xMax = cellRect?.xMax ?? (offsetRect?.colMax ?? bounds.maxX);
    const zMin = cellRect?.zMin ?? (offsetRect?.rowMin ?? bounds.minZ);
    const zMax = cellRect?.zMax ?? (offsetRect?.rowMax ?? bounds.maxZ);

    // lightweight deterministic RNG
    let seed = this.worldSeed >>> 0;
    function next() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }

    // compute a world-space cell size
    let cellSizeWorld;
    if (typeof this.world._hexSize === 'function') {
      cellSizeWorld = this.world._hexSize() * contactScale;
    } else {
      const a = this.world.cellToWorld({ x: 0, z: 0 });
      const b = this.world.cellToWorld({ x: 1, z: 0 });
      cellSizeWorld = Math.hypot(b.x - a.x, b.z - a.z) * contactScale;
    }
    for (let x = xMin; x <= xMax; x++) {
      for (let z = zMin; z <= zMax; z++) {
        if (typeof filter === 'function' && !filter(x, z)) continue;
        for (const t of this.types) {
          // sample cheaply: a low probability placement per tile scaled by density (if provided)
          const density = (t.density ?? 0.12);
          if (next() < density) {
            // offsets are a fraction of one cell in world units
            const offx = (next() - 0.5) * cellSizeWorld;
            const offz = (next() - 0.5) * cellSizeWorld;
            const yaw = next() * Math.PI * 2;
            const scl = (t.scale?.min ?? 0.6) + next() * ((t.scale?.max ?? 1.2) - (t.scale?.min ?? 0.6));
            placements.get(t.id).push({ x, z, offx, offz, yaw, scl });
          }
        }
      }
    }

    // Write into instanced pools
    for (const [id, list] of placements) {
      let pool = this.pools.get(id);
      const asset = this.assets.get(id);
      if (!pool) {
        // ensure pool exists
        const geom = asset?.geom || new THREE.CylinderGeometry(0.5, 0.5, 0.2, 6);
        const mat = asset?.material || new THREE.MeshLambertMaterial({ color: 0x88cc88 });
        const api = createInstancedMesh(geom, mat, Math.max(1, list.length));
        pool = { api, count: 0 };
        this.pools.set(id, pool);
        if (this.scene) this.scene.add(api.instancedMesh);
      }
  const api = pool.api;
  const mat4 = new THREE.Matrix4();
  const vecPos = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const sclV = new THREE.Vector3();
      const axisY = new THREE.Vector3(0, 1, 0);
      let dst = 0;
      for (let i = 0; i < list.length; i++) {
        const it = list[i];
        const tilePos = this.world.cellToWorld({ x: it.x, z: it.z });
        const x = tilePos.x + it.offx;
        const z = tilePos.z + it.offz;
        const baseY = hexMaxY * modelScaleY(it.x, it.z) + 0.005 * cellSizeWorld;
    vecPos.set(x, baseY, z);
        quat.setFromAxisAngle(axisY, it.yaw);

        // compute instance scale from asset native height if available
        let finalScale = it.scl * layoutRadius; // default fallback
        try {
          const assetScene = asset && asset.scene;
          const nativeH = assetScene && assetScene.userData && assetScene.userData.nativeHeight;
          // desired visual height: tile contact height * optional multiplier
          const desiredMultiplier = (asset && asset.desiredHeightMultiplier) || 1.0;
          const desiredHeight = Math.max(0.01, hexMaxY * desiredMultiplier);
          if (nativeH && nativeH > 1e-6) {
            // compute uniform scale so model's native height matches desiredHeight
            const scaleFromNative = desiredHeight / nativeH;
            finalScale = scaleFromNative;
          }
        } catch (e) {
          // fallback to prior scale
          finalScale = it.scl * layoutRadius;
        }

        sclV.setScalar(finalScale);
  mat4.compose(vecPos, quat, sclV);
        api.setInstanceMatrix(dst, mat4);
        dst += 1;
      }
  ensureInstanceCapacity(api.instancedMesh, dst);
      api.instancedMesh.instanceMatrix.needsUpdate = true;
      api.instancedMesh.visible = this.enabled && dst > 0;
      pool.count = dst;
    }
  }

  setShadows(enabled) {
    this._shadowsEnabled = !!enabled;
    for (const [, p] of this.pools) {
      if (p && p.api && p.api.instancedMesh) {
        p.api.instancedMesh.castShadow = this._shadowsEnabled;
        p.api.instancedMesh.receiveShadow = this._shadowsEnabled;
      }
    }
  }

  setEnabled(enabled) {
    this.enabled = !!enabled;
    for (const [, p] of this.pools) if (p && p.api && p.api.instancedMesh) p.api.instancedMesh.visible = this.enabled && p.count > 0;
  }

  setRadialFadeState({ enabled, center, radius, corner, cullWholeHex = true } = {}) {
    this._fade.enabled = !!enabled;
    if (center) this._fade.center.set(center.x ?? center[0] ?? 0, center.y ?? center[1] ?? 0);
    if (radius != null) this._fade.radius = radius;
    if (corner != null) this._fade.corner = corner;
    this._fade.cullWholeHex = !!cullWholeHex;
    // No-op: in this lightweight manager we don't have custom material uniforms to update.
  }
}

export function createClutterManager(opts) { return new ClutterManager(opts); }
