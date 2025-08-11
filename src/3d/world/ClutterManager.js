import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import makeRng from '@/3d/world/Random';
import { CLUTTER_TYPES, CLUTTER_SETTINGS } from '@/3d/world/clutter/definitions';

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
  this._fade = { enabled: false, center: new THREE.Vector2(0, 0), radius: 0.0, corner: 0.5, cullWholeHex: true };
  // Streaming job state for non-blocking commits
  this._job = null; // { token, phase, placements, tileIter, write, yCache, stats }
  this._jobToken = 0;
  this._rafId = null;
  this._idleId = null;
  this.streamBudgetMs = options.streamBudgetMs ?? 7; // per-tick budget
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
        // Attach radial fade discard to clutter materials; uniforms updated from WorldMap
  const self = this;
  /* eslint-disable no-param-reassign */
        mat.onBeforeCompile = (shader) => {
          shader.uniforms.uFadeCenter = { value: self._fade.center.clone() };
          shader.uniforms.uFadeRadius = { value: self._fade.radius };
          shader.uniforms.uFadeEnabled = { value: self._fade.enabled ? 1 : 0 };
          shader.uniforms.uHexCornerRadius = { value: self._fade.corner };
          shader.uniforms.uCullWholeHex = { value: self._fade.cullWholeHex ? 1 : 0 };
          const vDecl = '\n uniform vec2 uFadeCenter; uniform float uFadeRadius; uniform int uFadeEnabled; uniform float uHexCornerRadius; uniform int uCullWholeHex;\n varying vec3 vWorldPos; varying vec3 vInstCenter;\n';
          shader.vertexShader = vDecl + shader.vertexShader
            .replace('#include <begin_vertex>', `#include <begin_vertex>\n            mat4 imat = mat4(1.0);\n            #ifdef USE_INSTANCING\n              imat = instanceMatrix;\n            #endif\n            vec4 wcenter = modelMatrix * imat * vec4(0.0, 0.0, 0.0, 1.0);\n            vInstCenter = wcenter.xyz;\n            vec4 wpos_pre = modelMatrix * imat * vec4(transformed, 1.0);`)
            .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n  vWorldPos = wpos_pre.xyz;');
          const fDecl = '\n uniform vec2 uFadeCenter; uniform float uFadeRadius; uniform int uFadeEnabled; uniform float uHexCornerRadius; uniform int uCullWholeHex;\n varying vec3 vWorldPos; varying vec3 vInstCenter;\n';
          const inject = `\n            // CLUTTER_FADE\n            if (uFadeEnabled == 1) {\n              if (uCullWholeHex == 1) {\n                float cDist = length(vInstCenter.xz - uFadeCenter);\n                if ((cDist + uHexCornerRadius) >= uFadeRadius) { discard; }\n              } else {\n                float d = length(vWorldPos.xz - uFadeCenter);\n                if (d >= uFadeRadius) { discard; }\n              }\n            }\n          `;
          shader.fragmentShader = shader.fragmentShader
            .replace('#include <common>', '#include <common>' + fDecl)
            .replace('#include <dithering_fragment>', inject + '\n#include <dithering_fragment>');
          // Stash uniforms for live updates
          mat.userData._fadeUniforms = shader.uniforms;
  };
        // Create depth material mirroring the same discard so shadows match
        const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
        depth.onBeforeCompile = (shader) => {
          shader.uniforms.uFadeCenter = { value: self._fade.center.clone() };
          shader.uniforms.uFadeRadius = { value: self._fade.radius };
          shader.uniforms.uFadeEnabled = { value: self._fade.enabled ? 1 : 0 };
          shader.uniforms.uHexCornerRadius = { value: self._fade.corner };
          shader.uniforms.uCullWholeHex = { value: self._fade.cullWholeHex ? 1 : 0 };
          const vDecl = '\n uniform vec2 uFadeCenter; uniform float uFadeRadius; uniform int uFadeEnabled; uniform float uHexCornerRadius; uniform int uCullWholeHex;\n varying vec3 vWorldPos; varying vec3 vInstCenter;\n';
          shader.vertexShader = vDecl + shader.vertexShader
            .replace('#include <begin_vertex>', `#include <begin_vertex>\n            mat4 imat = mat4(1.0);\n            #ifdef USE_INSTANCING\n              imat = instanceMatrix;\n            #endif\n            vec4 wcenter = modelMatrix * imat * vec4(0.0, 0.0, 0.0, 1.0);\n            vInstCenter = wcenter.xyz;\n            vec4 wpos_pre = modelMatrix * imat * vec4(transformed, 1.0);`)
            .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n  vWorldPos = wpos_pre.xyz;');
          const fDecl = '\n uniform vec2 uFadeCenter; uniform float uFadeRadius; uniform int uFadeEnabled; uniform float uHexCornerRadius; uniform int uCullWholeHex;\n varying vec3 vWorldPos; varying vec3 vInstCenter;\n';
          const inject = `\n            // CLUTTER_FADE_DEPTH\n            if (uFadeEnabled == 1) {\n              if (uCullWholeHex == 1) {\n                float cDist = length(vInstCenter.xz - uFadeCenter);\n                if ((cDist + uHexCornerRadius) >= uFadeRadius) { discard; }\n              } else {\n                float d = length(vWorldPos.xz - uFadeCenter);\n                if (d >= uFadeRadius) { discard; }\n              }\n            }\n          `;
          shader.fragmentShader = shader.fragmentShader
            .replace('#include <common>', '#include <common>' + fDecl)
            .replace('#include <dithering_fragment>', inject + '\n#include <dithering_fragment>');
          depth.userData._fadeUniforms = shader.uniforms;
  };
  /* eslint-enable no-param-reassign */
        this.assets.set(t.id, { geom, material: mat, depthMaterial: depth });
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
  im.frustumCulled = false;
  im.castShadow = this._shadowsEnabled;
  im.receiveShadow = this._shadowsEnabled;
      // Ensure depth/distance share the same fade discard
      if (asset.depthMaterial) {
        im.customDepthMaterial = asset.depthMaterial;
        im.customDistanceMaterial = asset.depthMaterial;
      }
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

  // Build instances based on world data and spawn rules (non-blocking streaming).
  commitInstances({ layoutRadius, contactScale, hexMaxY, modelScaleY, filter, offsetRect, axialRect }) {
    if (!this.scene || !this.world) return;
    // Cancel any in-flight job
    this._cancelCommitJob();
    const token = ++this._jobToken;

    // Prepare job state
    const job = {
      token,
      phase: 1, // 1=collect placements, 2=ensure pools, 3=write instances
      opts: { layoutRadius, contactScale, hexMaxY, modelScaleY, filter, offsetRect, axialRect },
      placements: new Map(this.types.map((t) => [t.id, []])),
      // tile iterator state
      tileIter: this._makeTileIterator({ offsetRect, axialRect }),
      yCache: new Map(),
      // phase 3 write state
      write: { typeIndex: 0, instIndex: 0, maxWritable: 0, maxScl: 0 },
    };
    this._job = job;

  // Keep existing pools visible during streaming to avoid visible disappearance.
  // We will only increase counts as we stream new data and set final values at the end.
  for (const [, im] of this.pools) { if (im) { im.instanceMatrix.needsUpdate = true; } }

    // Kick off streaming
    this._scheduleCommitTick(token);
  }

  // Create a tile iterator that yields small batches of axial q,r
  _makeTileIterator({ offsetRect, axialRect }) {
    if (offsetRect && typeof offsetRect === 'object') {
      const { colMin, colMax, rowMin, rowMax } = offsetRect;
      let col = colMin;
      let row = rowMin;
      return {
        next: () => {
          if (col > colMax) return null;
          const q = col;
          const r = row - Math.floor(col / 2);
          const out = { q, r };
          row += 1;
          if (row > rowMax) { row = rowMin; col += 1; }
          return out;
        },
      };
    }
    if (axialRect && typeof axialRect === 'object') {
      const { qMin, qMax, rMin, rMax } = axialRect;
      let q = qMin;
      let r = rMin;
      return {
        next: () => {
          if (q > qMax) return null;
          const out = { q, r };
          r += 1;
          if (r > rMax) { r = rMin; q += 1; }
          return out;
        },
      };
    }
    // Full bounds fallback
    const b = this.world.bounds();
    let q = b.minQ; let r = b.minR;
    return {
      next: () => {
        if (q > b.maxQ) return null;
        const out = { q, r };
        r += 1;
        if (r > b.maxR) { r = b.minR; q += 1; }
        return out;
      },
    };
  }

  _cancelCommitJob() {
    this._job = null;
    this._jobToken += 1;
    if (this._rafId != null && typeof cancelAnimationFrame === 'function') {
      try { cancelAnimationFrame(this._rafId); } catch (e) {}
    }
    if (this._idleId != null && typeof cancelIdleCallback === 'function') {
      try { cancelIdleCallback(this._idleId); } catch (e) {}
    }
    this._rafId = null; this._idleId = null;
  }

  _scheduleCommitTick(token) {
    const run = () => this._processCommitTick(token);
    if (typeof requestIdleCallback === 'function') {
      this._idleId = requestIdleCallback(run, { timeout: Math.max(4, this.streamBudgetMs) });
    } else if (typeof requestAnimationFrame === 'function') {
      this._rafId = requestAnimationFrame(() => run());
    } else {
      setTimeout(run, 0);
    }
  }

  _processCommitTick(token) {
    const job = this._job;
    if (!job || token !== this._jobToken) return;
  const { layoutRadius, contactScale, filter } = job.opts;
  const hexMaxY = (job.opts && typeof job.opts.hexMaxY === 'number') ? job.opts.hexMaxY : 1.0;
  const modelScaleYFn = typeof job.opts.modelScaleY === 'function' ? job.opts.modelScaleY : (() => 1.0);
  const tileInner = layoutRadius * contactScale * this.avoidEdges;
  const doRadialCullWholeHex = this._fade.enabled && this._fade.cullWholeHex && this._fade.radius > 0;
  const fadeCx = this._fade.center.x;
  const fadeCz = this._fade.center.y;
  const fadeCorner = this._fade.corner || 0.0;
  const tStart = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();

    // Phase 1: generate placements by tiles
    if (job.phase === 1) {
      let steps = 0;
      for (;;) {
        const next = job.tileIter.next();
        if (!next) { job.phase = 2; break; }
        const { q, r } = next;
        // Cull whole tiles if outside fade reach
        if (doRadialCullWholeHex) {
          const hw = layoutRadius * 1.5;
          const hh = Math.sqrt(3) * layoutRadius;
          const hx = hw * q;
          const hz = hh * (r + q / 2);
          const d = Math.hypot(hx - fadeCx, hz - fadeCz);
          const minCenterDist = Math.max(0, d - tileInner);
          if ((minCenterDist + fadeCorner) >= this._fade.radius) { steps += 1; if ((performance.now?.() ?? Date.now()) - tStart >= this.streamBudgetMs) break; else continue; }
        }
        if (typeof filter === 'function' && !filter(q, r)) { steps += 1; if ((performance.now?.() ?? Date.now()) - tStart >= this.streamBudgetMs) break; else continue; }
        const cell = this.world.getCell(q, r);
        const biomeRules = (type) => type.biomes[cell.biome];
        const foliage = cell.f; const temp = cell.t;
        const seed = (q * 73856093) ^ (r * 19349663) ^ this.worldSeed;
        const rng = makeRng(seed >>> 0);
        const floraPlaced = [];
        for (const typeDef of this.types) {
          const rule = biomeRules(typeDef);
          if (!rule) continue;
          if (typeDef.id === 'tree_pine' && cell.biome !== 'deepWater' && cell.biome !== 'shallowWater') { if (temp > 0.45) continue; }
          if (typeDef.id === 'tree_round' && cell.biome !== 'deepWater' && cell.biome !== 'shallowWater') { if (temp < 0.35) continue; }
          const baseDensity = Math.max(0, (rule.density || 0) * this.densityMultiplier);
          const maxPerTile = Math.max(0, rule.maxPerTile || 0);
          if (baseDensity <= 0 || maxPerTile <= 0) continue;
          let capacity;
          if (typeDef.category === 'flora') {
            const fol = THREE.MathUtils.clamp((foliage - 0.28) / (0.82 - 0.28), 0, 1);
            capacity = Math.max(0, Math.round(THREE.MathUtils.lerp(0, maxPerTile, Math.pow(fol, 1.1))));
          } else {
            capacity = Math.max(0, maxPerTile);
          }
          if (capacity <= 0) continue;
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
            const baseR = (typeDef.desiredRadius || 0.3) * layoutRadius * scl;
            const minDist = baseR * 1.15 * (typeDef.category === 'flora' ? this.collisionFactorFlora : 1.0);
            let ok = true;
            if (typeDef.category === 'flora') {
              for (let j = 0; j < floraPlaced.length; j += 1) {
                const p = floraPlaced[j];
                const dx = offx - p.x; const dz = offz - p.z;
                if ((dx * dx + dz * dz) < (minDist + p.minDist) * (minDist + p.minDist)) { ok = false; break; }
              }
            }
            if (!ok) continue;
            job.placements.get(typeDef.id).push({ q, r, offx, offz, yaw, scl });
            if (typeDef.category === 'flora') floraPlaced.push({ x: offx, z: offz, minDist });
            placed += 1;
          }
        }
        steps += 1;
        const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
        if ((now - tStart) >= this.streamBudgetMs) break;
      }
      if (job.phase !== 2) { this._scheduleCommitTick(token); return; }
    }

    // Phase 2: ensure pools sized; replace if needed
  if (job.phase === 2) {
      for (const t of this.types) {
        const asset = this.assets.get(t.id);
        if (!asset) continue;
        const list = job.placements.get(t.id);
        const needed = Math.min(this.maxPerType, list.length);
        let im = this.pools.get(t.id);
        if (!im) {
          const cap = Math.max(1, needed);
          im = new THREE.InstancedMesh(asset.geom, asset.material, cap);
          im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
          im.count = 0;
          im.visible = this.enabled;
          im.frustumCulled = false;
          im.castShadow = this._shadowsEnabled;
          im.receiveShadow = this._shadowsEnabled;
          if (asset.depthMaterial) { im.customDepthMaterial = asset.depthMaterial; im.customDistanceMaterial = asset.depthMaterial; }
          if (this.scene) this.scene.add(im);
          this.pools.set(t.id, im);
        } else if (needed > im.instanceMatrix.count) {
          const grown = Math.max(needed, Math.ceil(im.instanceMatrix.count * 1.5));
          const cap = Math.min(this.maxPerType, grown);
          const newIM = new THREE.InstancedMesh(asset.geom, asset.material, cap);
          newIM.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
          newIM.visible = this.enabled;
          newIM.frustumCulled = false;
          newIM.castShadow = this._shadowsEnabled;
          newIM.receiveShadow = this._shadowsEnabled;
          if (asset.depthMaterial) { newIM.customDepthMaterial = asset.depthMaterial; newIM.customDistanceMaterial = asset.depthMaterial; }
          // Copy previous matrices to preserve current visuals
          try {
            const prevCount = Math.min(im.count | 0, newIM.instanceMatrix.count);
            if (prevCount > 0) {
              newIM.instanceMatrix.array.set(im.instanceMatrix.array.subarray(0, prevCount * 16), 0);
              newIM.count = prevCount;
              newIM.instanceMatrix.needsUpdate = true;
            } else {
              newIM.count = 0;
            }
          } catch (e) { newIM.count = im.count | 0; }
          // Swap in scene
          if (im.parent) im.parent.add(newIM); else if (this.scene) this.scene.add(newIM);
          if (im.parent) im.parent.remove(im);
          this.pools.set(t.id, newIM);
        } else {
          // Reuse existing pool; keep count so no flicker; we will overwrite progressively.
        }
        // Operate on the current pool (could have been swapped above)
        const pool = this.pools.get(t.id);
        if (pool) {
          // Clamp down any excess visible instances from the previous area right away
          if (typeof pool.count === 'number') {
            const clamped = Math.min(needed, pool.count | 0);
            if (clamped !== pool.count) pool.count = clamped;
          }
          // If this type has no placements in the new area, hide it immediately so stale instances disappear
          if (needed === 0) {
            if (pool.count !== 0) pool.count = 0;
            pool.visible = this.enabled && false;
          } else {
            // Keep it visible; final exact count will be set during phase 3 per-type finalize
            pool.visible = this.enabled;
          }
        }
      }
      // Init write state
  job.phase = 3;
  job.write = { typeIndex: 0, instIndex: 0, dstIndex: 0, maxWritable: 0, maxScl: 0 };
      this._scheduleCommitTick(token);
      return;
    }

    // Phase 3: write matrices progressively
    if (job.phase === 3) {
  const _mat = new THREE.Matrix4();
      const _pos = new THREE.Vector3();
      const _quat = new THREE.Quaternion();
      const _scl = new THREE.Vector3();
      const _axisY = new THREE.Vector3(0, 1, 0);
      const hexWidth = layoutRadius * 1.5;
      const hexHeight = Math.sqrt(3) * layoutRadius;
      const doRadialCull = this._fade.enabled && this._fade.cullWholeHex && this._fade.radius > 0;
      const cx = this._fade.center.x; const cz = this._fade.center.y; const cornerR = this._fade.corner || 0.0;
      // Write across types with time budget
      for (;;) {
        if (job.write.typeIndex >= this.types.length) { break; }
        const t = this.types[job.write.typeIndex];
        const im = this.pools.get(t.id);
        if (!im) { job.write.typeIndex += 1; job.write.instIndex = 0; job.write.dstIndex = 0; job.write.maxWritable = 0; job.write.maxScl = 0; continue; }
        const list = job.placements.get(t.id);
        if (job.write.maxWritable === 0) job.write.maxWritable = Math.min(im.instanceMatrix.count, list.length);
        const asset = this.assets.get(t.id);
        let maxScl = job.write.maxScl;
        while (job.write.instIndex < job.write.maxWritable) {
          const it = list[job.write.instIndex];
          const x = hexWidth * it.q + it.offx;
          const z = hexHeight * (it.r + it.q / 2) + it.offz;
          if (doRadialCull) {
            const dx = x - cx; const dz = z - cz; const cDist = Math.hypot(dx, dz);
            if ((cDist + cornerR) >= this._fade.radius) { job.write.instIndex += 1; continue; }
          }
          // Y cache per (q,r)
          const key = it.q + ',' + it.r;
          let y = job.yCache.get(key);
          if (y === undefined) { y = hexMaxY * modelScaleYFn(it.q, it.r) + (0.005 * layoutRadius); job.yCache.set(key, y); }
          _pos.set(x, y, z);
          _quat.setFromAxisAngle(_axisY, it.yaw);
          _scl.setScalar(it.scl * layoutRadius);
          _mat.compose(_pos, _quat, _scl);
          // Write to a stable destination index (overwriting front); avoid shrinking visible count mid-stream
          const wIdx = job.write.dstIndex;
          if (wIdx < im.instanceMatrix.count) im.setMatrixAt(wIdx, _mat);
          // Non-decreasing visible count during stream
          im.count = Math.max(im.count || 0, wIdx + 1);
          if (it.scl > maxScl) maxScl = it.scl;
          job.write.instIndex += 1;
          job.write.dstIndex += 1;

          // Budget check per few instances
          const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
          if ((now - tStart) >= this.streamBudgetMs) {
            im.instanceMatrix.needsUpdate = true;
            job.write.maxScl = maxScl;
            this._scheduleCommitTick(token);
            return;
          }
        }
        // Finished this type; finalize frustum tuning and advance
  // Finalize this type: clamp to written count, then update visibility
  im.count = Math.min(job.write.dstIndex, im.instanceMatrix.count);
  im.instanceMatrix.needsUpdate = true;
  im.visible = this.enabled && im.count > 0;
        if (doRadialCull && im.count > 0 && asset && asset.geom) {
          const geomBS = asset.geom.boundingSphere;
          const baseModelR = geomBS ? geomBS.radius : (t.desiredRadius || 0.5);
          const modelR = baseModelR * layoutRadius * (maxScl || 1);
          const sphereR = this._fade.radius + cornerR + modelR;
          const bs = new THREE.Sphere(new THREE.Vector3(cx, 0, cz), sphereR);
          if (!asset.geom._daemiosSharedCloned) {
            const cloned = asset.geom.clone(); cloned.boundingSphere = bs; im.geometry = cloned; asset.geom._daemiosSharedCloned = true;
          } else {
            im.geometry.boundingSphere = bs;
          }
          im.frustumCulled = true;
        } else if (!doRadialCull) {
          im.frustumCulled = false;
        }
  job.write.typeIndex += 1; job.write.instIndex = 0; job.write.dstIndex = 0; job.write.maxWritable = 0; job.write.maxScl = 0;
        const now2 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
        if ((now2 - tStart) >= this.streamBudgetMs) { this._scheduleCommitTick(token); return; }
      }
  // Done all types
  this._job = null;
      return;
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
  
  // External API: enable/disable clutter visibility globally
  setEnabled(enabled) {
    this.enabled = !!enabled;
    for (const [, im] of this.pools) {
      if (!im) continue;
      im.visible = this.enabled && (im.count > 0);
    }
  }

  // External API: drive fade uniforms from world each frame
  setRadialFadeState({ enabled, center, radius, corner, cullWholeHex = true }) {
    this._fade.enabled = !!enabled;
    if (center) this._fade.center.set(center.x || center[0] || 0, center.y || center[1] || 0);
    if (radius != null) this._fade.radius = radius;
    if (corner != null) this._fade.corner = corner;
    this._fade.cullWholeHex = !!cullWholeHex;
    // Push to all known materials
  /* eslint-disable no-param-reassign */
  const updateUniforms = (u) => {
      if (!u) return;
      if (u.uFadeEnabled) u.uFadeEnabled.value = this._fade.enabled ? 1 : 0;
      if (u.uFadeCenter && u.uFadeCenter.value) u.uFadeCenter.value.copy(this._fade.center);
      if (u.uFadeRadius) u.uFadeRadius.value = this._fade.radius;
      if (u.uHexCornerRadius) u.uHexCornerRadius.value = this._fade.corner;
      if (u.uCullWholeHex) u.uCullWholeHex.value = this._fade.cullWholeHex ? 1 : 0;
    };
  /* eslint-enable no-param-reassign */
    for (const [, asset] of this.assets) {
      const um = asset.material && asset.material.userData && asset.material.userData._fadeUniforms;
      updateUniforms(um);
      const ud = asset.depthMaterial && asset.depthMaterial.userData && asset.depthMaterial.userData._fadeUniforms;
      updateUniforms(ud);
    }
  }
}
