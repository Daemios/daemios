<template>
  <div
    ref="sceneContainer"
    class="world-map"
    style="position: relative; width: 100%; height: 100vh;"
  >
    <!-- Debug overlay -->
    <div
      v-if="debug.show"
      style="position: absolute; right: 6px; top: 28px; z-index: 2; background: rgba(0,0,0,0.55); color: #fff; padding: 8px 10px; border-radius: 6px; min-width: 220px;"
      @pointerdown.stop
      @pointermove.stop
      @pointerup.stop
      @click.stop
      @wheel.stop.prevent
      @contextmenu.stop.prevent
    >
      <details
        open
        style="margin: 0 0 6px 0;"
      >
        <summary
          style="cursor: pointer; user-select: none; outline: none;"
        >
          Rendering
        </summary>
        <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 6px; align-items: flex-end; text-align: right;">
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
            <input
              v-model="features.shadows"
              type="checkbox"
              @change="onToggleShadows"
            >
            Shadows
          </label>
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
            <input
              v-model="features.water"
              type="checkbox"
              @change="onToggleWater"
            >
            Water
          </label>
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
            <input
              v-model="features.sandUnderlay"
              type="checkbox"
              @change="onToggleSand"
            >
            Sand underlay
          </label>
        </div>
      </details>
      <!-- Future sections go here -->
    </div>
  </div>
</template>

<script>
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import SimplexNoise from 'simplex-noise';
import api from '@/functions/api';
import { BIOME_THRESHOLDS } from '@/terrain/biomes';
import WorldGrid from '@/world/WorldGrid';
import PlayerMarker from '@/renderer/PlayerMarker';
import ClutterManager from '@/world/ClutterManager';
import createStylizedWaterMaterial from '@/renderer/materials/StylizedWaterMaterial';

export default {
  name: 'WorldMap',
  data() {
    return {
      // core three
      scene: null,
      camera: null,
      renderer: null,
      composer: null,

      // instancing & picking
      topIM: null,
      sideIM: null,
      pickMeshes: [],
      indexToQR: [],
  topGeom: null,
  sideGeom: null,
  hoverIdx: null,
  hoverPrevColor: null,
  hoverMesh: null,
  playerMarker: null,
  // Water
  waterMesh: null,
  sandMesh: null,
  waterMaterial: null,
  waterMaskTex: null,
  // Location marker (GLB)
  locationMarker: null,
  markerDesiredRadius: 0.6, // as fraction of layoutRadius
  markerTopOffset: 0, // world-space top offset for marker focus
  hexMaxY: 1, // max Y of a tile in local space after recenter
  cameraTween: null,
  tweenSaved: {
    tilt: { h: null, v: null },
    pixelRatio: null,
  },
  tmpMatrix: new THREE.Matrix4(),
  hoverTmpPos: new THREE.Vector3(),
  hoverTmpQuat: new THREE.Quaternion(),
  hoverTmpScale: new THREE.Vector3(),

  // world data / systems
  world: null, // WorldGrid instance
  clutter: null, // ClutterManager instance

      // interaction
      raycaster: new THREE.Raycaster(),
      mouse: new THREE.Vector2(),
      rotating: false,
      dragStart: { x: 0, y: 0 },

      // model/meta
      hexModel: null,
      fxaaPass: null,
      modelScaleFactor: 1,
      modelCenter: new THREE.Vector3(0, 0, 0),
      orientation: 'flat',
      orbit: {
        target: new THREE.Vector3(0, 0, 0),
        radius: 30,
        theta: Math.PI / 4,
        phi: Math.PI / 4,
        minRadius: 5,
        maxRadius: 150,
        minPhi: 0.15,
        maxPhi: Math.PI / 2 - 0.05,
      },

      // layout
      layoutRadius: 0.5,
  gridSize: 20,
  spacingFactor: 1.0, // exact geometric spacing for hex lattice
  contactScale: 1.0, // auto-computed after model load to make tiles touch
  gapFraction: 0.0, // desired gap size as a fraction of layoutRadius (0 = touching)

      // elevation shaping
      elevation: {
        base: 0.08,
        max: 1.2,
        curve: 1.35,
        minLand: 0.32,
        shorelineBlend: 0.08,
      },
      terrainShape: {
        baseFreq: 0.07,
        mountainFreq: 0.16,
        mountainThreshold: 0.78,
        mountainStrength: 0.6,
        plainsExponent: 1.6,
        mountainExponent: 1.25,
        finalExponent: 1.25,
      },

      // fps
      fpsFrames: 0,
      fpsTime: 0,
      fps: 0,
      fpsEl: null,

  // Post FX
  
  // Debug / Features
  debug: { show: true },
  features: { shadows: true, water: true, sandUnderlay: false },

  // Lights
  ambientLight: null,
  keyLight: null,
    };
  },
  mounted() {
    this.init();
    window.addEventListener('resize', this.onResize);
    this.$refs.sceneContainer.addEventListener('pointerdown', this.onPointerDown);
    this.$refs.sceneContainer.addEventListener('pointermove', this.onPointerMove);
    this.$refs.sceneContainer.addEventListener('pointerup', this.onPointerUp);
    this.$refs.sceneContainer.addEventListener('pointerleave', this.onPointerUp);
    this.$refs.sceneContainer.addEventListener('contextmenu', this.blockContext);
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.onResize);
    this.$refs.sceneContainer.removeEventListener('pointerdown', this.onPointerDown);
    this.$refs.sceneContainer.removeEventListener('pointermove', this.onPointerMove);
    this.$refs.sceneContainer.removeEventListener('pointerup', this.onPointerUp);
    this.$refs.sceneContainer.removeEventListener('pointerleave', this.onPointerUp);
    this.$refs.sceneContainer.removeEventListener('wheel', this.onWheel);
    this.$refs.sceneContainer.removeEventListener('contextmenu', this.blockContext);
  },
  methods: {
    computeContactScaleFromGeom() {
      if (!this.topGeom || !this.topGeom.attributes || !this.topGeom.attributes.position) return 1.0;
      const pos = this.topGeom.attributes.position;
      const R = this.layoutRadius;
      const deltas = [
        new THREE.Vector2(1.5 * R, Math.sqrt(3) * 0.5 * R),
        new THREE.Vector2(1.5 * R, -Math.sqrt(3) * 0.5 * R),
        new THREE.Vector2(0, Math.sqrt(3) * R),
        new THREE.Vector2(-1.5 * R, -Math.sqrt(3) * 0.5 * R),
        new THREE.Vector2(-1.5 * R, Math.sqrt(3) * 0.5 * R),
        new THREE.Vector2(0, -Math.sqrt(3) * R),
      ];
  const sx = this.modelScaleFactor || 1.0;
      let needed = Infinity;
      for (let k = 0; k < deltas.length; k += 1) {
        const delta = deltas[k];
        const centerDist = delta.length();
        if (centerDist === 0) continue;
        const d = delta.clone().normalize();
        let minDot = Infinity;
        let maxDot = -Infinity;
        for (let i = 0; i < pos.count; i += 1) {
          const x = pos.getX(i);
          const z = pos.getZ(i);
          const dot = x * d.x + z * d.y;
          if (dot < minDot) minDot = dot;
          if (dot > maxDot) maxDot = dot;
        }
        const footprint = (maxDot - minDot);
        if (footprint > 0) {
          const desiredGap = Math.max(0, (this.gapFraction || 0) * this.layoutRadius);
          const centerMinusGap = Math.max(0.001, centerDist - desiredGap);
          const required = centerMinusGap / (sx * footprint);
          if (required < needed) needed = required;
        }
      }
      if (!isFinite(needed)) return 1.0;
      // Return the scale that yields at least the desired gap along all directions
      return Math.max(0.5, Math.min(1.5, needed));
    },
    init() {
      const width = this.$refs.sceneContainer.clientWidth;
      const height = this.$refs.sceneContainer.clientHeight;

      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
      this.camera.position.set(0, 20, 20);
      this.camera.lookAt(0, 0, 0);

      const camVec = this.camera.position.clone().sub(this.orbit.target);
      this.orbit.radius = camVec.length();
      this.orbit.theta = Math.atan2(camVec.x, camVec.z);
      this.orbit.phi = Math.acos(camVec.y / this.orbit.radius);

  this.renderer = new THREE.WebGLRenderer({ antialias: false });
  // Slightly upscale to reduce aliasing while keeping perf in check
  const devicePR = Math.min(1.5, (window.devicePixelRatio || 1));
  this.renderer.setPixelRatio(devicePR);
      this.renderer.setSize(width, height);
      if (this.renderer.outputEncoding !== undefined) this.renderer.outputEncoding = THREE.sRGBEncoding;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.0;
      this.renderer.physicallyCorrectLights = false;
      this.$refs.sceneContainer.appendChild(this.renderer.domElement);

      // FPS overlay
      this.fpsEl = document.createElement('div');
      Object.assign(this.fpsEl.style, {
        position: 'absolute', top: '4px', right: '6px', padding: '2px 6px',
        background: 'rgba(0,0,0,0.4)', color: '#fff', font: '11px monospace',
        borderRadius: '4px', pointerEvents: 'none', zIndex: 1,
      });
      this.fpsEl.textContent = 'FPS: --';
      this.$refs.sceneContainer.appendChild(this.fpsEl);

  this.composer = new EffectComposer(this.renderer);
  const renderPass = new RenderPass(this.scene, this.camera);
  this.composer.addPass(renderPass);

  const pr = this.renderer.getPixelRatio();

  this.fxaaPass = new ShaderPass(FXAAShader);
  this.fxaaPass.material.uniforms.resolution.value.set(1 / (width * pr), 1 / (height * pr));
  this.composer.addPass(this.fxaaPass);

  this.ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
      this.keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
      this.keyLight.position.set(22, 40, 28);
      this.scene.add(this.ambientLight, this.keyLight);
      // Apply initial feature toggles
      this.applyShadows(this.features.shadows);

      // Wheel zoom
      this.onWheel = this.onWheel.bind(this);
      this.$refs.sceneContainer.addEventListener('wheel', this.onWheel, { passive: false });

      // Init world data and auxiliary systems
      this.world = new WorldGrid({
        layoutRadius: this.layoutRadius,
        gridSize: this.gridSize,
        elevation: this.elevation,
        terrainShape: this.terrainShape,
      });
  this.clutter = new ClutterManager();

      this.loadModel();
      this.animate = this.animate.bind(this);
      this.animate();
    },
    loadModel() {
      const loader = new GLTFLoader();
  loader.load('/models/hex-can.glb', (gltf) => {
        this.hexModel = gltf.scene;
        if (this.orientation === 'flat') {
          this.hexModel.rotation.y = Math.PI / 6;
        }
  const orientedBox = new THREE.Box3().setFromObject(this.hexModel);
        const sizeVec = new THREE.Vector3();
        orientedBox.getSize(sizeVec);
        orientedBox.getCenter(this.modelCenter);
  const targetFlatWidth = 2 * this.layoutRadius;
  const refWidth = Math.max(sizeVec.x, sizeVec.z);
  this.modelScaleFactor = targetFlatWidth / refWidth;
  // Do NOT scale the source model; we'll scale per instance and use unscaled center*scale for offsets

  // Ensure matrices are up to date so matrixWorld contains parent rotation
  this.hexModel.updateWorldMatrix(true, true);

        // Fix normals if inverted
        this.hexModel.traverse((child) => {
          if (child.isMesh && child.geometry) {
            const geom = child.geometry;
            if (!geom.attributes.normal) geom.computeVertexNormals();
            geom.computeBoundingSphere();
            const center = geom.boundingSphere ? geom.boundingSphere.center : new THREE.Vector3();
            const pos = geom.attributes.position;
            const normal = geom.attributes.normal;
            let inward = 0; let total = 0;
            const tmpV = new THREE.Vector3();
            const tmpN = new THREE.Vector3();
            const step = Math.max(1, Math.floor(pos.count / 60));
            for (let i = 0; i < pos.count; i += step) {
              tmpV.fromBufferAttribute(pos, i).sub(center);
              tmpN.fromBufferAttribute(normal, i);
              if (tmpV.dot(tmpN) < 0) inward++;
              total++;
            }
            if (total > 0 && inward > total / 2) {
              geom.scale(-1, 1, 1);
              geom.computeVertexNormals();
            }
          }
        });

        // Extract base geometries for instancing
    this.topGeom = null;
    this.sideGeom = null;
        this.hexModel.traverse((child) => {
          if (child.isMesh) {
            const name = (child.name || '').toLowerCase();
            const g = child.geometry.clone();
            g.applyMatrix4(child.matrixWorld.clone());
            if (name.includes('top')) this.topGeom = g; else this.sideGeom = g;
          }
        });
        // Fallback if naming doesn't match expectations
        if (!this.topGeom && this.sideGeom) {
          console.warn('[WorldMap] top geometry not found; using side geometry as top');
          this.topGeom = this.sideGeom.clone();
        }
        if (!this.sideGeom && this.topGeom) {
          console.warn('[WorldMap] side geometry not found; using top geometry as side');
          this.sideGeom = this.topGeom.clone();
        }
        // Normalize both geometries so their bottom sits at y=0 and x/z are centered at origin
        const recenter = (geom) => {
          if (!geom) return;
          geom.computeBoundingBox();
          if (!geom.boundingBox) return;
          const box = geom.boundingBox;
          const center = new THREE.Vector3();
          box.getCenter(center);
          const minY = box.min.y;
          const m = new THREE.Matrix4().makeTranslation(-center.x, -minY, -center.z);
          geom.applyMatrix4(m);
          geom.computeBoundingSphere();
        };
        recenter(this.topGeom);
        recenter(this.sideGeom);
        // After normalization, compute modelScaleFactor from corner radius (max distance to corner in XZ)
        if (this.topGeom && this.topGeom.attributes && this.topGeom.attributes.position) {
          // Cache max Y extent of combined tile geoms
          this.topGeom.computeBoundingBox();
          this.sideGeom && this.sideGeom.computeBoundingBox();
          const topMaxY = this.topGeom.boundingBox ? this.topGeom.boundingBox.max.y : 1;
          const sideMaxY = (this.sideGeom && this.sideGeom.boundingBox) ? this.sideGeom.boundingBox.max.y : topMaxY;
          this.hexMaxY = Math.max(topMaxY, sideMaxY);

          const pos = this.topGeom.attributes.position;
          let maxR = 0;
          for (let i = 0; i < pos.count; i += 1) {
            const x = pos.getX(i);
            const z = pos.getZ(i);
            const r = Math.hypot(x, z);
            if (r > maxR) maxR = r;
          }
          if (maxR > 0) {
            this.modelScaleFactor = this.layoutRadius / maxR;
          }
          const suggested = this.computeContactScaleFromGeom();
          const applied = Math.max(0.5, Math.min(1.5, suggested));
          this.contactScale = applied;
          console.info('[WorldMap] gapFraction =', (this.gapFraction || 0).toFixed(4), 'contactScale =', applied.toFixed(4));
        }
        this.createHexGrid();
      }, undefined, (err) => {
        console.error('[WorldMap] Failed to load /models/hex-can.glb', err);
      });
    },
    createHexGrid() {
    if (!this.topGeom || !this.sideGeom) return;
      const layoutRadius = this.layoutRadius;
  const hexWidth = layoutRadius * 1.5 * this.spacingFactor;
  const hexHeight = Math.sqrt(3) * layoutRadius * this.spacingFactor;
      const size = this.gridSize;
      const maxHeight = this.elevation.max;
  const sx = this.modelScaleFactor;
  const xzScale = sx * this.contactScale; // widen footprint slightly to avoid cracks
      const tmpColor = new THREE.Color();
      const tmpSide = new THREE.Color();

      const count = (2 * size + 1) * (2 * size + 1);
  const topMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const sideMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  this.topIM = new THREE.InstancedMesh(this.topGeom, topMat, count);
  this.sideIM = new THREE.InstancedMesh(this.sideGeom, sideMat, count);
      this.topIM.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.sideIM.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

      const dummy = new THREE.Object3D();
      this.indexToQR = new Array(count);
      let i = 0;
      this.world.forEach((q, r) => {
        const cell = this.world.getCell(q, r);
        const color = cell.colorTop;
        const sideColor = cell.colorSide;

        const x = hexWidth * q;
        const z = hexHeight * (r + q / 2);
        dummy.position.set(x, 0, z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(xzScale, sx * cell.yScale, xzScale);
        dummy.updateMatrix();
        this.topIM.setMatrixAt(i, dummy.matrix);
        this.sideIM.setMatrixAt(i, dummy.matrix);
        this.topIM.setColorAt(i, color);
        this.sideIM.setColorAt(i, sideColor);
        this.indexToQR[i] = { q, r };
        i += 1;
      });
      this.topIM.instanceMatrix.needsUpdate = true;
      this.sideIM.instanceMatrix.needsUpdate = true;
      if (this.topIM.instanceColor) this.topIM.instanceColor.needsUpdate = true;
      if (this.sideIM.instanceColor) this.sideIM.instanceColor.needsUpdate = true;
    this.scene.add(this.sideIM);
  this.scene.add(this.topIM);
  // Water after terrain
  this.buildWater();
  // Respect initial water toggle
  if (this.waterMesh) this.waterMesh.visible = this.features.water;
      // Prepare clutter for the current grid
      if (this.clutter) {
        this.clutter.addTo(this.scene);
        this.clutter.prepareFromGrid(this.world);
        const commit = () => {
          const layoutRadius = this.layoutRadius;
          const contactScale = this.contactScale;
          const hexMaxY = this.hexMaxY;
          const modelScaleY = (q, r) => {
            const c = this.world.getCell(q, r);
            return this.modelScaleFactor * (c ? c.yScale : 1);
          };
          this.clutter.commitInstances({ layoutRadius, contactScale, hexMaxY, modelScaleY });
        };
        this.clutter.loadAssets().then(commit);
      }
      // Initial marker placement on a random land tile and smooth focus
      const startIdx = this.chooseRandomTileIndex({ landOnly: true });
      if (startIdx != null) {
        this.addLocationMarkerAtIndex(startIdx);
        this.focusCameraOnIndex(startIdx, { smooth: true, duration: 900 });
      }
      // Create a single hover overlay mesh to avoid relying on instance colors
  if (this.topIM) {
        const hoverMat = new THREE.MeshBasicMaterial({
          color: 0xffff66,
          transparent: true,
          opacity: 0.35,
          depthTest: true,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -1,
          polygonOffsetUnits: -1,
        });
        this.hoverMesh = new THREE.Mesh(this.topGeom, hoverMat);
        this.hoverMesh.visible = false;
        this.hoverMesh.matrixAutoUpdate = false;
        // No forced renderOrder; rely on depth for proper occlusion
        this.scene.add(this.hoverMesh);
      }
      if (!this.playerMarker) {
        this.playerMarker = new PlayerMarker();
        this.playerMarker.addTo(this.scene);
  // Ensure current shadow setting applied to new meshes
  this.applyShadows(this.features.shadows);
      }
      this.pickMeshes = [this.topIM, this.sideIM];
    },
    buildWater() {
      // Remove old
      if (this.waterMesh) { if (this.waterMesh.parent) this.waterMesh.parent.remove(this.waterMesh); this.waterMesh = null; }
      if (this.sandMesh) { if (this.sandMesh.parent) this.sandMesh.parent.remove(this.sandMesh); this.sandMesh = null; }
      // 1) Create land mask texture (N x N), R channel 1.0=land, 0.0=water
      const N = (2 * this.gridSize + 1);
      const data = new Uint8Array(N * N * 4);
      let i = 0;
      for (let r = -this.gridSize; r <= this.gridSize; r += 1) {
        for (let q = -this.gridSize; q <= this.gridSize; q += 1) {
          const cell = this.world.getCell(q, r);
          const isWater = cell && (cell.biome === 'deepWater' || cell.biome === 'shallowWater');
          const v = isWater ? 0 : 255;
          data[i] = v; // R
          data[i + 1] = 0;
          data[i + 2] = 0;
          data[i + 3] = 255;
          i += 4;
        }
      }
      const tex = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
      tex.needsUpdate = true;
      tex.magFilter = THREE.LinearFilter;
      tex.minFilter = THREE.LinearFilter;
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      this.waterMaskTex = tex;

      // 2) Cull water tile TOPS and compress SIDE height to a tiny sliver; remove any blue tint
      if (this.topIM) {
        const tmpColor = new THREE.Color(0, 0, 0);
        const pos = new THREE.Vector3();
        const quat = new THREE.Quaternion();
        const scl = new THREE.Vector3();
        let culled = 0;
        for (let idx = 0; idx < this.indexToQR.length; idx += 1) {
          const coord = this.indexToQR[idx];
          if (!coord) continue;
          const cell = this.world.getCell(coord.q, coord.r);
          const isWater = cell && (cell.biome === 'deepWater' || cell.biome === 'shallowWater');
          if (isWater) {
            // Zero color (in case material uses per-instance colors)
            if (this.topIM.instanceColor) this.topIM.setColorAt(idx, tmpColor);
            // Cull TOP: set scale to zero
            this.topIM.getMatrixAt(idx, this.tmpMatrix);
            this.tmpMatrix.decompose(pos, quat, scl);
            const zero = new THREE.Vector3(0, 0, 0);
            this.tmpMatrix.compose(pos, quat, zero);
            this.topIM.setMatrixAt(idx, this.tmpMatrix);
            // Keep SIDES as a very short skirt to avoid corner highlights without forming visible walls
            if (this.sideIM) {
              // Use original X/Z scale, compress Y to a tiny epsilon
              const sideScale = new THREE.Vector3(scl.x, Math.max(0.001, 0.02 * (this.modelScaleFactor || 1)), scl.z);
              this.tmpMatrix.compose(pos, quat, sideScale);
              this.sideIM.setMatrixAt(idx, this.tmpMatrix);
              if (this.sideIM.instanceColor) this.sideIM.setColorAt(idx, tmpColor);
            }
            culled += 1;
          }
        }
        this.topIM.instanceMatrix.needsUpdate = true;
        if (this.sideIM) this.sideIM.instanceMatrix.needsUpdate = true;
        if (this.topIM.instanceColor) this.topIM.instanceColor.needsUpdate = true;
        if (this.sideIM && this.sideIM.instanceColor) this.sideIM.instanceColor.needsUpdate = true;
        console.info('[WorldMap] buildWater: culled water tiles =', culled);
      }

      // Compute minima
      let minTop = Infinity;
      let minTopWater = Infinity;
      let waterCount = 0;
      const modelScaleY = (q, r) => {
        const c = this.world.getCell(q, r);
        return this.modelScaleFactor * (c ? c.yScale : 1);
      };
      this.world.forEach((q, r) => {
        const cell = this.world.getCell(q, r);
        const topY = this.hexMaxY * modelScaleY(q, r);
        if (topY < minTop) minTop = topY;
        const isWater = cell && (cell.biome === 'deepWater' || cell.biome === 'shallowWater');
        if (isWater) {
          if (topY < minTopWater) minTopWater = topY;
          waterCount += 1;
        }
      });
      if (!isFinite(minTop)) minTop = this.hexMaxY * this.modelScaleFactor;
      if (waterCount > 0 && isFinite(minTopWater)) minTop = minTopWater;

      // 3) Single large planes spanning the map
      const planeSize = (this.gridSize * this.layoutRadius * this.spacingFactor * 4);
      const geom = new THREE.PlaneGeometry(planeSize * 3, planeSize * 3, 1, 1);
      geom.rotateX(-Math.PI / 2);

      // Simple sand underlay to avoid black background
      const sandGeom = geom.clone();
      const sandMat = new THREE.MeshBasicMaterial({ color: 0xD7C49E, transparent: true, opacity: 1.0, depthWrite: false });
      const sand = new THREE.Mesh(sandGeom, sandMat);
      const sandY = Math.max(0.01 * this.hexMaxY * this.modelScaleFactor, 0.10 * minTop);
      sand.position.y = sandY;
      sand.renderOrder = 0;
      sand.frustumCulled = false;
      sand.castShadow = false;
      sand.receiveShadow = false;
      this.scene.add(sand);
      this.sandMesh = sand;

      // Water plane
      const hexW = this.layoutRadius * 1.5 * this.spacingFactor;
      const hexH = Math.sqrt(3) * this.layoutRadius * this.spacingFactor;
      const mat = createStylizedWaterMaterial({
        opacity: 0.96,
        maskTexture: this.waterMaskTex,
        hexW,
        hexH,
        gridN: (2 * this.gridSize + 1),
        gridOffset: this.gridSize,
        shoreWidth: 0.12,
      });
      this.waterMaterial = mat;
      const mesh = new THREE.Mesh(geom, mat);
      const waterY = Math.max(0.05 * this.hexMaxY * this.modelScaleFactor, 0.50 * minTop);
      mesh.position.y = waterY;
      mesh.renderOrder = 1;
      mesh.frustumCulled = false;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      this.scene.add(mesh);
      this.waterMesh = mesh;

      const visible = !!this.features.water;
      if (this.waterMesh) this.waterMesh.visible = visible;
      if (this.sandMesh) this.sandMesh.visible = !!this.features.sandUnderlay && visible;
    },
    getHeight(q, r) {
      const base = (this.heightNoise.noise2D(q * this.terrainShape.baseFreq, r * this.terrainShape.baseFreq) + 1) / 2;
      const plains = Math.pow(base, this.terrainShape.plainsExponent);
      const mRaw = (this.mountainNoise.noise2D(q * this.terrainShape.mountainFreq + 250, r * this.terrainShape.mountainFreq + 250) + 1) / 2;
      let mountain = 0;
      if (mRaw > this.terrainShape.mountainThreshold) {
        const norm = (mRaw - this.terrainShape.mountainThreshold) / (1 - this.terrainShape.mountainThreshold);
        mountain = Math.pow(norm, this.terrainShape.mountainExponent) * this.terrainShape.mountainStrength;
      }
      let h = plains + mountain;
      h = Math.min(1, Math.max(0, h));
      h = Math.pow(h, this.terrainShape.finalExponent);
      return h;
    },
    animate() {
      requestAnimationFrame(this.animate);
      // Camera tween update before render
      if (this.cameraTween && this.cameraTween.active) {
        const now = performance.now();
        const t = Math.min(1, (now - this.cameraTween.startTime) / this.cameraTween.duration);
        // Smoothstep ease
        const tt = t * t * (3 - 2 * t);
        // Lerp target
        this.orbit.target.lerpVectors(this.cameraTween.start.target, this.cameraTween.end.target, tt);
        // Lerp radius
        this.orbit.radius = this.cameraTween.start.radius + (this.cameraTween.end.radius - this.cameraTween.start.radius) * tt;
        // Shortest-angle lerp for theta
        const a = this.cameraTween.start.theta;
        const b = this.cameraTween.end.theta;
        let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
        if (d < -Math.PI) d += Math.PI * 2;
        this.orbit.theta = a + d * tt;
        // Lerp phi
        this.orbit.phi = this.cameraTween.start.phi + (this.cameraTween.end.phi - this.cameraTween.start.phi) * tt;
        this.updateCameraFromOrbit();
        if (t >= 1) {
          this.cameraTween.active = false;
          // Restore pixel ratio after tween
          if (this.tweenSaved.pixelRatio != null) {
            this.renderer.setPixelRatio(this.tweenSaved.pixelRatio);
            this.tweenSaved.pixelRatio = null;
            this.onResize();
          }
        }
      }
      // Animate water
      if (this.waterMaterial) {
        this.waterMaterial.uniforms.uTime.value = (performance.now() * 0.001);
      }
      // Update billboards (yaw-only) before render
      if (this.playerMarker) this.playerMarker.faceCamera(this.camera);
      if (this.locationMarker && this.locationMarker.visible) {
        // Extract position and scale from marker's current matrix
        const pos = new THREE.Vector3();
        const quat = new THREE.Quaternion();
        const scl = new THREE.Vector3();
        this.locationMarker.matrix.decompose(pos, quat, scl);
        const dx = this.camera.position.x - pos.x;
        const dz = this.camera.position.z - pos.z;
  // Add 90° to align the marker's flat face toward the camera
  const yaw = Math.atan2(dx, dz) + Math.PI / 2;
        const yQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), yaw);
        this.locationMarker.matrix.compose(pos, yQuat, scl);
      }
      this.composer.render();
      // Keep tilt-shift focal line tracking the current target each frame
      if (this.tiltShiftEnabled) this.updateTiltFocus();
      const now = performance.now();
      if (!this.fpsTime) { this.fpsTime = now; this.fpsFrames = 0; }
      this.fpsFrames += 1;
      const elapsed = now - this.fpsTime;
      if (elapsed >= 500) {
        this.fps = Math.round((this.fpsFrames * 1000) / elapsed);
        if (this.fpsEl) this.fpsEl.textContent = `FPS: ${this.fps}`;
        this.fpsTime = now; this.fpsFrames = 0;
      }
    },
    onResize() {
      const width = this.$refs.sceneContainer.clientWidth;
      const height = this.$refs.sceneContainer.clientHeight;
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
      this.composer.setSize(width, height);
  const pr = this.renderer.getPixelRatio();
  if (this.fxaaPass) this.fxaaPass.material.uniforms.resolution.value.set(1 / (width * pr), 1 / (height * pr));
  if (this.tiltShiftEnabled) this.updateTiltFocus();
    },
    onPointerDown(event) {
      if (event.button === 2) {
        this.rotating = true;
        this.dragStart.x = event.clientX;
        this.dragStart.y = event.clientY;
        return;
      }
      if (event.button !== 0) return;
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      this.raycaster.setFromCamera(this.mouse, this.camera);
  const intersects = this.raycaster.intersectObjects(this.pickMeshes, true);
      if (intersects.length > 0) {
        const hit = intersects[0];
        const idx = hit.instanceId;
        if (idx != null && this.indexToQR[idx]) {
          const { q, r } = this.indexToQR[idx];
          api.post('world/move', { q, r });
          // Also move camera focus and location marker locally with smoothing
          this.focusCameraOnQR(q, r, { smooth: true, duration: 700 });
          this.addLocationMarkerAtIndex(idx);
        }
      }
    },
    onPointerMove(event) {
      if (this.rotating) {
        const dx = event.movementX || (event.clientX - this.dragStart.x);
        const dy = event.movementY || (event.clientY - this.dragStart.y);
        const baseSpeed = 0.0015;
        const adapt = Math.sqrt(this.orbit.radius) / Math.sqrt(30);
        const rotateSpeed = baseSpeed * adapt;
        this.orbit.theta -= dx * rotateSpeed;
        this.orbit.phi -= dy * rotateSpeed;
        this.orbit.phi = Math.min(this.orbit.maxPhi, Math.max(this.orbit.minPhi, this.orbit.phi));
        this.updateCameraFromOrbit();
        this.dragStart.x = event.clientX;
        this.dragStart.y = event.clientY;
        return;
      }
      // Skip hover work during camera tween to reduce CPU/GPU contention
      if (this.cameraTween && this.cameraTween.active) {
        this.hoverIdx = null;
        if (this.hoverMesh) this.hoverMesh.visible = false;
        return;
      }
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObjects(this.pickMeshes, true);
      if (intersects.length > 0) {
        const hit = intersects[0];
        const idx = hit.instanceId;
        if (idx != null) {
          this.topIM.getMatrixAt(idx, this.tmpMatrix);
          this.hoverMesh.matrix.copy(this.tmpMatrix);
          // Keep scale identical; rely on polygonOffset to avoid z-fighting
          this.hoverMesh.visible = true;
          this.hoverIdx = idx;
          // Update player marker preview to current hover (prepping for movement UX)
          if (this.playerMarker) this.playerMarker.setPosition(idx, this.topIM);
        }
      } else {
        this.hoverIdx = null;
        if (this.hoverMesh) this.hoverMesh.visible = false;
      }
    },
    onPointerUp(event) {
      if (event.button === 2) this.rotating = false;
    },
    updateCameraFromOrbit() {
      const { radius, theta, phi, target } = this.orbit;
      const x = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.cos(phi);
      this.camera.position.set(target.x + x, target.y + y, target.z + z);
      this.camera.lookAt(target);
    },
    
    startCameraTween(to) {
      const clampedPhi = Math.min(this.orbit.maxPhi, Math.max(this.orbit.minPhi, to.phi != null ? to.phi : this.orbit.phi));
      const end = {
        target: to.target ? to.target.clone() : this.orbit.target.clone(),
        radius: to.radius != null ? to.radius : this.orbit.radius,
        theta: to.theta != null ? to.theta : this.orbit.theta,
        phi: clampedPhi,
      };
  // Perf boost during tween: reduce pixel ratio (keep tilt-shift enabled to avoid disorientation)
      if (this.tweenSaved.pixelRatio == null) {
        this.tweenSaved.pixelRatio = this.renderer.getPixelRatio();
        if (this.tweenSaved.pixelRatio > 1.0) {
          this.renderer.setPixelRatio(1.0);
          this.onResize();
        }
      }
      this.cameraTween = {
        active: true,
        startTime: performance.now(),
        duration: to.duration != null ? to.duration : 700,
        start: {
          target: this.orbit.target.clone(),
          radius: this.orbit.radius,
          theta: this.orbit.theta,
          phi: this.orbit.phi,
        },
        end,
      };
    },
    // Compute world XZ for a flat-top axial coordinate
    getTileWorldPos(q, r) {
      const layoutRadius = this.layoutRadius;
      const hexWidth = layoutRadius * 1.5 * this.spacingFactor;
      const hexHeight = Math.sqrt(3) * layoutRadius * this.spacingFactor;
      const x = hexWidth * q;
      const z = hexHeight * (r + q / 2);
      return { x, z };
    },
    // Focus camera target on tile. opts: { radius, phi, theta, smooth, duration }
    focusCameraOnQR(q, r, opts = {}) {
      const { x, z } = this.getTileWorldPos(q, r);
      if (opts.smooth) {
        this.startCameraTween({
          target: new THREE.Vector3(x, 0, z),
          radius: opts.radius != null ? opts.radius : this.orbit.radius,
          theta: opts.theta != null ? opts.theta : this.orbit.theta,
          phi: opts.phi != null ? opts.phi : this.orbit.phi,
          duration: opts.duration,
        });
      } else {
        this.orbit.target.set(x, 0, z);
        if (opts.radius != null) this.orbit.radius = opts.radius;
        if (opts.theta != null) this.orbit.theta = opts.theta;
        if (opts.phi != null) this.orbit.phi = Math.min(this.orbit.maxPhi, Math.max(this.orbit.minPhi, opts.phi));
        this.updateCameraFromOrbit();
      }
    },
    focusCameraOnIndex(idx, opts = {}) {
      if (idx == null || !this.indexToQR[idx]) return;
      const { q, r } = this.indexToQR[idx];
      this.focusCameraOnQR(q, r, opts);
    },
    // Random tile selection. landOnly defaults true to avoid ocean.
    chooseRandomTileIndex({ landOnly = true } = {}) {
      if (!this.indexToQR || this.indexToQR.length === 0) return null;
      const attempts = Math.min(200, this.indexToQR.length * 2);
      for (let k = 0; k < attempts; k += 1) {
        const idx = Math.floor(Math.random() * this.indexToQR.length);
        const coord = this.indexToQR[idx];
        if (!coord) continue;
        if (!landOnly || !this.world) return idx;
        const cell = this.world.getCell(coord.q, coord.r);
        if (cell && cell.biome !== 'deepWater' && cell.biome !== 'shallowWater') return idx;
      }
      // Fallback
      return Math.floor(Math.random() * this.indexToQR.length);
    },
    // Ensure the GLB location marker is loaded and normalized.
    ensureLocationMarkerLoaded(cb) {
      if (this.locationMarker) { cb && cb(); return; }
      const loader = new GLTFLoader();
      loader.load('/models/location-marker.glb', (gltf) => {
        const marker = gltf.scene;
        // Normalize: center XZ and sit base on y=0
        marker.updateWorldMatrix(true, true);
        const box = new THREE.Box3().setFromObject(marker);
        const center = new THREE.Vector3();
        box.getCenter(center);
        const minY = box.min.y;
        const m = new THREE.Matrix4().makeTranslation(-center.x, -minY, -center.z);
        marker.traverse((child) => { if (child.isMesh) child.geometry && child.geometry.applyMatrix4(m); });
        // Recompute bbox after bake
  const geomBox = new THREE.Box3().setFromObject(marker);
        // Compute current XZ radius
        const size = new THREE.Vector3(); geomBox.getSize(size);
        const currentR = Math.max(size.x, size.z) * 0.5 || 1;
        const desiredR = this.layoutRadius * this.markerDesiredRadius;
        const s = desiredR / currentR;
        marker.scale.setScalar(s);
  // After scaling, recompute size to capture world-space height
  const scaledBox = new THREE.Box3().setFromObject(marker);
  const scaledSize = new THREE.Vector3(); scaledBox.getSize(scaledSize);
  this.markerTopOffset = scaledSize.y;
        marker.visible = false;
        marker.matrixAutoUpdate = false;
        // Apply a subtle red tint to all meshes in the marker
        const tintMat = new THREE.MeshBasicMaterial({
          color: 0xb53a3a,
          transparent: true,
          opacity: 1.0,
          depthTest: true,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -2,
          polygonOffsetUnits: -2,
        });
        marker.traverse((n) => {
          const mesh = n;
          if (mesh && mesh.isMesh) {
            mesh.material = tintMat;
            mesh.renderOrder = 4; // draw after water (water is 1)
          }
        });
        this.locationMarker = marker;
        this.scene.add(marker);
        cb && cb();
      }, undefined, (err) => {
        console.error('[WorldMap] Failed to load /models/location-marker.glb', err);
        cb && cb(err);
      });
    },
    // Place marker at tile instance index (uses instance matrix for position)
    addLocationMarkerAtIndex(idx) {
      if (idx == null || !this.topIM) return;
      this.ensureLocationMarkerLoaded((err) => {
        if (err) return;
        const m = new THREE.Matrix4();
        this.topIM.getMatrixAt(idx, m);
        const pos = new THREE.Vector3();
        const quat = new THREE.Quaternion();
        const scl = new THREE.Vector3();
        m.decompose(pos, quat, scl);
  // Keep marker’s own scale; ignore instance scale. Position above tile top surface.
        const markerQuat = new THREE.Quaternion();
        const markerScale = this.locationMarker.scale.clone();
  const lift = 0.05 * this.layoutRadius; // small world-space lift
  pos.y = this.hexMaxY * scl.y + lift;
        this.locationMarker.matrix.compose(pos, markerQuat, markerScale);
        this.locationMarker.visible = true;
      });
    },
    addRandomLocationMarker() {
      const idx = this.chooseRandomTileIndex({ landOnly: true });
      if (idx != null) {
        this.addLocationMarkerAtIndex(idx);
        this.focusCameraOnIndex(idx);
      }
    },
    onWheel(e) {
      e.preventDefault();
      const zoomFactor = 1 + (e.deltaY > 0 ? 0.12 : -0.12);
      this.orbit.radius *= zoomFactor;
      this.orbit.radius = Math.min(this.orbit.maxRadius, Math.max(this.orbit.minRadius, this.orbit.radius));
      this.updateCameraFromOrbit();
    },
    blockContext(e) { e.preventDefault(); },

    // Debug / Features
    onToggleShadows() {
      this.applyShadows(this.features.shadows);
    },
    onToggleWater() {
      if (!this.waterMesh) this.buildWater();
    if (this.waterMesh) this.waterMesh.visible = this.features.water;
    if (this.sandMesh) this.sandMesh.visible = !!this.features.sandUnderlay && this.features.water;
    },
    onToggleSand() {
      if (this.sandMesh) this.sandMesh.visible = !!this.features.sandUnderlay && !!this.features.water;
    },
    applyShadows(enabled) {
      if (!this.renderer || !this.scene) return;
      // Renderer shadow map
      this.renderer.shadowMap.enabled = !!enabled;
      if (enabled) this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      // Key light shadows
      if (this.keyLight) {
        this.keyLight.castShadow = !!enabled;
        const cam = this.keyLight.shadow.camera;
        // Cover the grid extents generously
        const range = Math.max(40, this.gridSize * this.layoutRadius * 3.0);
        cam.left = -range; cam.right = range; cam.top = range; cam.bottom = -range;
        this.keyLight.shadow.near = 1;
        this.keyLight.shadow.far = 250;
        this.keyLight.shadow.mapSize.set(2048, 2048);
  this.keyLight.shadow.bias = -0.00006;
  this.keyLight.shadow.normalBias = 0.12;
        cam.updateProjectionMatrix();
      }
      // Hex meshes
      if (this.topIM) { this.topIM.castShadow = !!enabled; this.topIM.receiveShadow = !!enabled; }
      if (this.sideIM) { this.sideIM.castShadow = !!enabled; this.sideIM.receiveShadow = !!enabled; }
      // Clutter instances
      if (this.clutter && this.clutter.setShadows) this.clutter.setShadows(!!enabled);
      // Location marker: cast only (MeshBasic won't receive)
      if (this.locationMarker) {
        const setShadows = (node) => {
          if (node && node.isMesh) {
            const mesh = node;
            mesh.castShadow = !!enabled;
            mesh.receiveShadow = false;
          }
        };
        this.locationMarker.traverse(setShadows);
      }
    },
  },
};
</script>

<style scoped>
.world-map {
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>
