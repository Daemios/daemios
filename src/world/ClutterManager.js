import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import makeRng from '@/world/Random';
import { CLUTTER_TYPES, CLUTTER_SETTINGS } from '@/world/clutter/definitions';

// Helper to normalize a loaded mesh: center XZ, base at y=0
function normalizeScene(root) {
  root.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(root);
  const center = new THREE.Vector3(); box.getCenter(center);
  const minY = box.min.y;
  const m = new THREE.Matrix4().makeTranslation(-center.x, -minY, -center.z);
  root.traverse((child) => { if (child.isMesh && child.geometry) child.geometry.applyMatrix4(m); });
}

export default class ClutterManager {
  constructor(options = {}) {
    this.enabled = options.enabled ?? CLUTTER_SETTINGS.enabled;
    this.densityMultiplier = options.densityMultiplier ?? CLUTTER_SETTINGS.densityMultiplier;
    this.avoidEdges = options.avoidEdges ?? CLUTTER_SETTINGS.avoidEdges;
  this.collisionFactorFlora = options.collisionFactorFlora ?? CLUTTER_SETTINGS.collisionFactorFlora ?? 1.0;

    this.loader = new GLTFLoader();
    this.types = CLUTTER_TYPES;
    this.assets = new Map(); // id -> { geom, meshTemplate }
    this.pools = new Map(); // id -> InstancedMesh
    this.scene = null;
    this.world = null;
    this.worldSeed = 1337;
    this.maxPerType = 15000; // hard cap safety
  this._shadowsEnabled = false;
  }

  addTo(scene) { this.scene = scene; this._ensurePools(); this._attachPools(); }
  removeFrom(scene) { this._detachPools(); this.scene = null; }

  // Load all referenced GLBs once
  async loadAssets() {
    const promises = this.types.map((t) => this._loadType(t));
    await Promise.all(promises);
  }

  async _loadType(t) {
    if (this.assets.has(t.id)) return;
    return new Promise((resolve, reject) => {
      this.loader.load(t.model, (gltf) => {
        const src = gltf.scene;
        normalizeScene(src);
        // Merge all meshes into a single BufferGeometry (assume one top-level mesh if simple)
        let geom = null;
        src.traverse((child) => {
          if (child.isMesh && child.geometry) {
            const g = child.geometry;
            // Fix normals if inverted
            if (!g.attributes.normal) g.computeVertexNormals();
            const pos = g.attributes.position;
            const normal = g.attributes.normal;
            g.computeBoundingSphere();
            const center = g.boundingSphere ? g.boundingSphere.center : new THREE.Vector3();
            let inward = 0, total = 0;
            const tmpV = new THREE.Vector3();
            const tmpN = new THREE.Vector3();
            const step = Math.max(1, Math.floor(pos.count / 50));
            for (let i = 0; i < pos.count; i += step) {
              tmpV.fromBufferAttribute(pos, i).sub(center);
              tmpN.fromBufferAttribute(normal, i);
              if (tmpV.dot(tmpN) < 0) inward++;
              total++;
            }
            if (total > 0 && inward > total / 2) {
              g.scale(-1, 1, 1);
              g.computeVertexNormals();
            }
            if (!geom) geom = g.clone();
          }
        });
        if (!geom) { console.warn('[Clutter] No geometry in', t.id); resolve(); return; }
        geom.computeBoundingSphere();
  const mat = new THREE.MeshLambertMaterial({ color: t.baseColor || 0xffffff, side: THREE.FrontSide });
  // Render both sides into the shadow map to reduce hollow/crescent artifacts on thin shells
  mat.shadowSide = THREE.DoubleSide;
        // Scale geometry to desired radius relative to layoutRadius (defer exact scale to per-instance random range)
        if (t.desiredRadius) {
          const bs = geom.boundingSphere || { radius: 1 };
          const currentR = bs.radius > 0 ? bs.radius : 1;
          const baseLayoutR = 1.0; // we’ll scale per instance using layoutRadius outside
          const targetR = baseLayoutR * t.desiredRadius;
          const s = targetR / currentR;
          geom.scale(s, s, s);
          geom.computeBoundingSphere();
        }
        this.assets.set(t.id, { geom, material: mat });
        resolve();
      }, undefined, (err) => {
        console.error('[Clutter] Failed to load', t.model, err);
        resolve();
      });
    });
  }

  _ensurePools() {
    if (!this.scene) return;
    for (const t of this.types) {
      if (this.pools.has(t.id)) continue;
      const asset = this.assets.get(t.id);
      if (!asset) continue;
      const count = Math.min(this.maxPerType, 1); // will grow when committing
      const im = new THREE.InstancedMesh(asset.geom, asset.material, count);
      im.count = 0; // no instances until commit
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      im.visible = this.enabled;
  im.castShadow = this._shadowsEnabled;
  im.receiveShadow = this._shadowsEnabled;
      this.pools.set(t.id, im);
    }
  }

  _attachPools() {
    if (!this.scene) return;
    for (const [, im] of this.pools) if (!im.parent) this.scene.add(im);
  }

  _detachPools() {
    for (const [, im] of this.pools) if (im.parent) im.parent.remove(im);
  }

  prepareFromGrid(worldGrid) {
    this.world = worldGrid;
  }

  // Build instances based on world data and spawn rules.
  commitInstances({ layoutRadius, contactScale, hexMaxY, modelScaleY }) {
    if (!this.scene || !this.world) return;
    const rngBase = makeRng(this.worldSeed);
    const tileInner = layoutRadius * contactScale * this.avoidEdges;

    // Collect placements per type
    const placements = new Map();
    for (const t of this.types) placements.set(t.id, []);

    const bounds = this.world.bounds();
    for (let q = bounds.minQ; q <= bounds.maxQ; q += 1) {
      for (let r = bounds.minR; r <= bounds.maxR; r += 1) {
        const cell = this.world.getCell(q, r);
        const biomeRules = (type) => type.biomes[cell.biome];
        const foliage = cell.f; // 0..1
        const temp = cell.t; // 0..1
        // Per-tile RNG seed
        const seed = (q * 73856093) ^ (r * 19349663) ^ this.worldSeed;
        const rng = makeRng(seed >>> 0);

        // Shared per-tile flora placements for collision across tree types
        const floraPlaced = [];

        for (const typeDef of this.types) {
          const rule = biomeRules(typeDef);
          if (!rule) continue;
          // Temperature gating for tree types
          if (typeDef.id === 'tree_pine' && cell.biome !== 'deepWater' && cell.biome !== 'shallowWater') {
            // Prefer cold: suppress in warm temps
            if (temp > 0.45) continue;
          }
          if (typeDef.id === 'tree_round' && cell.biome !== 'deepWater' && cell.biome !== 'shallowWater') {
            // Prefer warm: suppress in cold temps
            if (temp < 0.35) continue;
          }

          const baseDensity = Math.max(0, (rule.density || 0) * this.densityMultiplier);
          const maxPerTile = Math.max(0, rule.maxPerTile || 0);
          if (baseDensity <= 0 || maxPerTile <= 0) continue;

          // Capacity by foliage for flora; else derive from density directly
          let capacity;
          if (typeDef.category === 'flora') {
            const fol = THREE.MathUtils.clamp((foliage - 0.28) / (0.82 - 0.28), 0, 1);
            capacity = Math.max(0, Math.round(THREE.MathUtils.lerp(0, maxPerTile, Math.pow(fol, 1.1))));
          } else {
            // For non-flora (e.g., rocks), don't round tiny densities to zero.
            // Use full capacity and gate acceptance by baseDensity probability per attempt.
            capacity = Math.max(0, maxPerTile);
          }
          if (capacity <= 0) continue;

          // Rejection sampling with collision avoidance; acceptance gated by biome density
          const maxAttempts = Math.max(capacity * 8, maxPerTile * 6);
          let placed = 0;
          for (let k = 0; k < maxAttempts && placed < capacity; k += 1) {
            if (!rng.chance(baseDensity)) continue;
            const rr = tileInner * Math.sqrt(rng.next());
            const th = rng.next() * Math.PI * 2;
            const offx = rr * Math.cos(th);
            const offz = rr * Math.sin(th);
            const yaw = (typeDef.rotation && typeDef.rotation.yawRandom) ? rng.nextIn(0, Math.PI * 2) : 0;
            const scl = rng.nextIn(typeDef.scale.min, typeDef.scale.max);

            // Collision radius based on desiredRadius and scale
            const baseR = (typeDef.desiredRadius || 0.3) * layoutRadius * scl;
            const minDist = baseR * 1.15 * (typeDef.category === 'flora' ? this.collisionFactorFlora : 1.0);
            let ok = true;
            if (typeDef.category === 'flora') {
              for (let j = 0; j < floraPlaced.length; j += 1) {
                const p = floraPlaced[j];
                const dx = offx - p.x;
                const dz = offz - p.z;
                if ((dx * dx + dz * dz) < (minDist + p.minDist) * (minDist + p.minDist)) { ok = false; break; }
              }
            }
            if (!ok) continue;
            placements.get(typeDef.id).push({ q, r, offx, offz, yaw, scl });
            if (typeDef.category === 'flora') floraPlaced.push({ x: offx, z: offz, minDist });
            placed += 1;
          }
        }
      }
    }

    // Ensure pools exist with sufficient capacity, then write instances
    const dummy = new THREE.Object3D();
    const hexWidth = layoutRadius * 1.5; // spacingFactor=1
    const hexHeight = Math.sqrt(3) * layoutRadius;
    for (const t of this.types) {
      const asset = this.assets.get(t.id);
      if (!asset) continue;
      const list = placements.get(t.id);
      const needed = Math.min(this.maxPerType, list.length);
      let im = this.pools.get(t.id);
      if (!im) {
        // Create pool on the fly if missing
        const cap = Math.max(1, needed);
        im = new THREE.InstancedMesh(asset.geom, asset.material, cap);
        im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        im.count = 0;
        im.visible = this.enabled;
        im.frustumCulled = false; // avoid incorrect culling across wide map
  im.castShadow = this._shadowsEnabled;
  im.receiveShadow = this._shadowsEnabled;
        if (this.scene) this.scene.add(im);
        this.pools.set(t.id, im);
      } else if (needed > im.instanceMatrix.count) {
        // Replace with larger capacity
        const cap = needed;
        const newIM = new THREE.InstancedMesh(asset.geom, asset.material, cap);
        newIM.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        newIM.visible = this.enabled;
        newIM.frustumCulled = false;
  newIM.castShadow = this._shadowsEnabled;
  newIM.receiveShadow = this._shadowsEnabled;
        if (im.parent) im.parent.add(newIM); else if (this.scene) this.scene.add(newIM);
        if (im.parent) im.parent.remove(im);
        this.pools.set(t.id, newIM);
      }
    }
    // Second pass to actually write matrices after possible pool creation/replacement
  for (const t of this.types) {
      const im = this.pools.get(t.id);
      if (!im) continue;
      const list = placements.get(t.id);
  const writeCount = Math.min(im.instanceMatrix.count, list.length);
  for (let i = 0; i < writeCount; i += 1) {
        const it = list[i];
        const x = hexWidth * it.q + it.offx;
        const z = hexHeight * (it.r + it.q / 2) + it.offz;
  // Slight lift to avoid z-fight, kept very small to preserve contact shadows
  const y = hexMaxY * modelScaleY(it.q, it.r) + (0.005 * layoutRadius);
        dummy.position.set(x, y, z);
        dummy.rotation.set(0, it.yaw, 0);
    // Scale up to map scale: desiredRadius was relative to layoutRadius base=1
    dummy.scale.setScalar(it.scl * layoutRadius);
        dummy.updateMatrix();
        im.setMatrixAt(i, dummy.matrix);
      }
      im.instanceMatrix.needsUpdate = true;
  im.count = writeCount;
  im.visible = this.enabled && writeCount > 0;
    }
  }

  // External API: enable/disable shadows on all pools
  setShadows(enabled) {
    this._shadowsEnabled = !!enabled;
    for (const [, im] of this.pools) {
      if (!im) continue;
      im.castShadow = this._shadowsEnabled;
      im.receiveShadow = this._shadowsEnabled;
    }
  }
}
