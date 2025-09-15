import * as THREE from 'three';
import { createInstancedMesh } from '@/3d2/renderer/instancing';
import { ensureInstanceCapacity } from '@/3d2/renderer/instancingUtils';
import { axialToXZ, getHexSize } from '@/3d2/config/layout';

// ...existing code...

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

  // Simplified commitInstances: synchronously generate placements for axialRect or world bounds.
  commitInstances({ layoutRadius = 1, contactScale = 0.6, hexMaxY = 1, modelScaleY = () => 1, filter = null, offsetRect = null, axialRect = null } = {}) {
    if (!this.scene || !this.world) return;
    // Build a small sample of placements per type using a deterministic RNG derived from worldSeed
    const placements = new Map();
    for (const t of this.types) placements.set(t.id, []);

  const bounds = this.world.bounds ? this.world.bounds() : { minQ: -1, maxQ: 1, minR: -1, maxR: 1 };
  // support either offsetRect or axialRect; prefer axialRect if provided
  const qMin = axialRect?.qMin ?? (offsetRect?.colMin ?? bounds.minQ);
  const qMax = axialRect?.qMax ?? (offsetRect?.colMax ?? bounds.maxQ);
  const rMin = axialRect?.rMin ?? (offsetRect?.rowMin ?? bounds.minR);
  const rMax = axialRect?.rMax ?? (offsetRect?.rowMax ?? bounds.maxR);

    // lightweight deterministic RNG
    let seed = this.worldSeed >>> 0;
    function next() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }

  // compute a world-space hex size and use axialToXZ for positions
  const hexSizeWorld = getHexSize({ layoutRadius, spacingFactor: contactScale });
    for (let q = qMin; q <= qMax; q++) {
      for (let r = rMin; r <= rMax; r++) {
        if (typeof filter === 'function' && !filter(q, r)) continue;
  for (const t of this.types) {
          // sample cheaply: a low probability placement per tile scaled by density (if provided)
          const density = (t.density ?? 0.12);
          if (next() < density) {
            // offsets are a fraction of one hex in world units
            const offx = (next() - 0.5) * hexSizeWorld;
            const offz = (next() - 0.5) * hexSizeWorld;
            const yaw = next() * Math.PI * 2;
            const scl = (t.scale?.min ?? 0.6) + next() * ((t.scale?.max ?? 1.2) - (t.scale?.min ?? 0.6));
            placements.get(t.id).push({ q, r, offx, offz, yaw, scl });
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
    const tilePos = axialToXZ(it.q, it.r, { layoutRadius, spacingFactor: contactScale });
    const x = tilePos.x + it.offx;
    const z = tilePos.z + it.offz;
    const baseY = hexMaxY * modelScaleY(it.q, it.r) + 0.005 * hexSizeWorld;
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
