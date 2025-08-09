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
          style="cursor: pointer; user-select: none; outline: none; text-align: right;"
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
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
            <input
              v-model="features.chunkColors"
              type="checkbox"
              @change="onToggleChunkColors"
            >
            Chunk colors
          </label>
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
            <input
              v-model="radialFade.enabled"
              type="checkbox"
              @change="onToggleRadialFade"
            >
            Radial fade
          </label>
          <div style="display: flex; flex-direction: column; gap: 6px; width: 100%; margin-top: 6px;">
            <div style="display: flex; align-items: center; gap: 8px; justify-content: space-between;">
              <span style="opacity: 0.8;">Fade radius</span>
              <input
                v-model.number="radialFade.radius"
                type="range"
                min="1"
                :max="layoutRadius * chunkCols"
                step="0.5"
                :disabled="!radialFade.enabled"
                style="flex: 1;"
              >
            </div>
            <div style="display: flex; align-items: center; gap: 8px; justify-content: space-between;">
              <span style="opacity: 0.8;">Fade width</span>
              <input
                v-model.number="radialFade.width"
                type="range"
                min="0.25"
                :max="layoutRadius * 8"
                step="0.25"
                :disabled="!radialFade.enabled"
                style="flex: 1;"
              >
            </div>
            <div style="display: flex; align-items: center; gap: 8px; justify-content: space-between;">
              <span style="opacity: 0.8;">Min height scale</span>
              <input
                v-model.number="radialFade.minHeightScale"
                type="range"
                min="0"
                max="0.5"
                step="0.01"
                :disabled="!radialFade.enabled"
                style="flex: 1;"
              >
            </div>
          </div>
        </div>
      </details>
      <!-- Future sections go here -->
    </div>
  </div>
</template>

<script>
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { useSettingsStore } from '@/stores/settingsStore';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { markRaw } from 'vue';
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
      recenterTimer: null,
      pendingCenterChunk: null,
      // Trail layer to keep previous chunk neighborhood visible briefly
      trailTopIM: null,
      trailSideIM: null,
      trailTimer: null,
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
      tmpMatrix: markRaw(new THREE.Matrix4()),
      hoverTmpPos: markRaw(new THREE.Vector3()),
      hoverTmpQuat: markRaw(new THREE.Quaternion()),
      hoverTmpScale: markRaw(new THREE.Vector3()),

      // world data / systems
      world: null, // WorldGrid instance
      clutter: null, // ClutterManager instance

      // interaction
      raycaster: markRaw(new THREE.Raycaster()),
      mouse: markRaw(new THREE.Vector2()),
      rotating: false,
      dragStart: { x: 0, y: 0 },

      // model/meta
      hexModel: null,
      fxaaPass: null,
      
      modelScaleFactor: 1,
      modelCenter: markRaw(new THREE.Vector3(0, 0, 0)),
      orientation: 'flat',
      orbit: {
        target: markRaw(new THREE.Vector3(0, 0, 0)),
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

      // Chunking (rectangular chunks over hex grid using even-q offset)
      chunkCols: 28,
      chunkRows: 24,
      countPerChunk: 0, // computed in init of chunks
      neighborOffsets: [
        { dx: -1, dy: -1 }, { dx: 0, dy: -1 }, { dx: 1, dy: -1 },
        { dx: -1, dy:  0 }, { dx: 0, dy:  0 }, { dx: 1, dy:  0 },
        { dx: -1, dy:  1 }, { dx: 0, dy:  1 }, { dx: 1, dy:  1 },
      ],
      centerChunk: { x: 1, y: 1 },

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
  
  // Debug / Features (defaults; will be overridden from settings if present)
  debug: { show: true },
  features: { shadows: true, water: true, sandUnderlay: false, chunkColors: true },
  radialFade: { enabled: false, color: 0xF3EED9, radius: 0, width: 5.0, minHeightScale: 0.05 },
  
  // Rendering toggles
  // Default chunkColors: true (use per-chunk pastel overrides)
  // The object above is initialized in data(); extend it here for clarity

  // Lights
  ambientLight: null,
  keyLight: null,
    };
  },
  mounted() {
    // Load persisted settings for this view (header: settings.worldMap)
    try {
  const settings = useSettingsStore();
  const saved = settings.get('worldMap', null);
      if (saved && typeof saved === 'object') {
        if (saved.debug && typeof saved.debug === 'object') Object.assign(this.debug, saved.debug);
        if (saved.features && typeof saved.features === 'object') Object.assign(this.features, saved.features);
        if (saved.radialFade && typeof saved.radialFade === 'object') Object.assign(this.radialFade, saved.radialFade);
      }
    } catch (e) { /* noop */ }
    // Persist any changes back to settings
    this.$watch(() => ({
      debug: this.debug,
      features: this.features,
      radialFade: this.radialFade,
    }), (val) => {
  const settings = useSettingsStore();
  settings.mergeAtPath({ path: 'worldMap', value: val });
    }, { deep: true, immediate: true });

    this.init();
    window.addEventListener('resize', this.onResize);
    this.$refs.sceneContainer.addEventListener('pointerdown', this.onPointerDown);
    this.$refs.sceneContainer.addEventListener('pointermove', this.onPointerMove);
    this.$refs.sceneContainer.addEventListener('pointerup', this.onPointerUp);
    this.$refs.sceneContainer.addEventListener('pointerleave', this.onPointerUp);
    this.$refs.sceneContainer.addEventListener('contextmenu', this.blockContext);
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.onResize);
    this.$refs.sceneContainer.removeEventListener('pointerdown', this.onPointerDown);
    this.$refs.sceneContainer.removeEventListener('pointermove', this.onPointerMove);
    this.$refs.sceneContainer.removeEventListener('pointerup', this.onPointerUp);
    this.$refs.sceneContainer.removeEventListener('pointerleave', this.onPointerUp);
    this.$refs.sceneContainer.removeEventListener('wheel', this.onWheel);
    this.$refs.sceneContainer.removeEventListener('contextmenu', this.blockContext);
  },
  methods: {
    setupRadialFade(mat, bucketKey) {
      const self = this;
  /* eslint-disable no-param-reassign */
      mat.onBeforeCompile = (shader) => {
        shader.uniforms.uFadeCenter = { value: new THREE.Vector2(0, 0) };
        shader.uniforms.uFadeRadius = { value: self.radialFade.radius };
        shader.uniforms.uFadeWidth = { value: self.radialFade.width };
        shader.uniforms.uFadeEnabled = { value: self.radialFade.enabled ? 1 : 0 };
        shader.uniforms.uMinHeightScale = { value: self.radialFade.minHeightScale != null ? self.radialFade.minHeightScale : 0.05 };
        // New uniforms to support whole-hex culling (no slicing of tiles)
        shader.uniforms.uCullWholeHex = { value: 1 };
        shader.uniforms.uHexCornerRadius = { value: self.layoutRadius * self.contactScale };
        // Vertex stage: compress height within (radius - width, radius)
        const vertDecl = '\n uniform vec2 uFadeCenter; uniform float uFadeRadius; uniform float uFadeWidth; uniform int uFadeEnabled; uniform float uMinHeightScale; uniform int uCullWholeHex; uniform float uHexCornerRadius;\n varying vec3 vWorldPos; varying vec3 vInstCenter;\n';
        shader.vertexShader = vertDecl + shader.vertexShader
          .replace('#include <begin_vertex>', `#include <begin_vertex>
            mat4 imat = mat4(1.0);
            #ifdef USE_INSTANCING
              imat = instanceMatrix;
            #endif
            // Compute instance world center (hex center)
            vec4 wcenter = modelMatrix * imat * vec4(0.0, 0.0, 0.0, 1.0);
            vInstCenter = wcenter.xyz;
            vec4 wpos_pre = modelMatrix * imat * vec4(transformed, 1.0);
            float distXZ_v = length(wpos_pre.xz - vec2(uFadeCenter.x, uFadeCenter.y));
            float inner_v = max(0.0, uFadeRadius - uFadeWidth);
            float f_v = float(uFadeEnabled) * smoothstep(inner_v, uFadeRadius, distXZ_v);
            transformed.y = mix(transformed.y, transformed.y * uMinHeightScale, f_v);
          `)
          .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n  vWorldPos = worldPosition.xyz;');
        // Fragment stage: either discard entire instances (whole-hex) or slice fragments (legacy)
  const fadeDecl = '\n uniform vec2 uFadeCenter; uniform float uFadeRadius; uniform float uFadeWidth; uniform int uFadeEnabled; uniform float uMinHeightScale; uniform int uCullWholeHex; uniform float uHexCornerRadius;\n varying vec3 vWorldPos; varying vec3 vInstCenter;\n';
        const injectFrag = `
            // RADIAL_FADE_APPLIED
            float distXZ = length(vWorldPos.xz - uFadeCenter);
            // Whole-hex culling: hide entire instance if its center plus hex reach crosses the radius
            if (uFadeEnabled == 1) {
              if (uCullWholeHex == 1) {
                float cDist = length(vInstCenter.xz - uFadeCenter);
                if ((cDist + uHexCornerRadius) >= uFadeRadius) { discard; }
              } else {
                if (distXZ >= uFadeRadius) { discard; }
              }
            }
            #include <premultiplied_alpha_fragment>
        `;
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', '#include <common>' + fadeDecl)
          .replace('#include <premultiplied_alpha_fragment>', injectFrag);
        if (shader.fragmentShader.indexOf('RADIAL_FADE_APPLIED') === -1) {
          // Fallback for materials without premultiplied include
          shader.fragmentShader = shader.fragmentShader.replace('#include <dithering_fragment>', `
            // RADIAL_FADE_APPLIED
            float distXZ = length(vWorldPos.xz - uFadeCenter);
            if (uFadeEnabled == 1) {
              if (uCullWholeHex == 1) {
                float cDist = length(vInstCenter.xz - uFadeCenter);
                if ((cDist + uHexCornerRadius) >= uFadeRadius) { discard; }
              } else {
                if (distXZ >= uFadeRadius) { discard; }
              }
            }
            #include <dithering_fragment>
          `);
        }
        if (!self._fadeUniforms) self._fadeUniforms = {};
        self._fadeUniforms[bucketKey] = shader.uniforms;
      };
  mat.needsUpdate = true;
  /* eslint-enable no-param-reassign */
    },
    snapshotTrailAndArmClear(delayMs = 3000) {
      if (!this.topIM || !this.sideIM || !this.trailTopIM || !this.trailSideIM) return;
      const count = this.topIM.count;
      // Copy matrices
      this.trailTopIM.instanceMatrix.copy(this.topIM.instanceMatrix);
      this.trailSideIM.instanceMatrix.copy(this.sideIM.instanceMatrix);
      this.trailTopIM.instanceMatrix.needsUpdate = true;
      this.trailSideIM.instanceMatrix.needsUpdate = true;
      // Colors
      if (this.topIM.instanceColor && this.trailTopIM.instanceColor) {
        this.trailTopIM.instanceColor.array.set(this.topIM.instanceColor.array);
        this.trailTopIM.instanceColor.needsUpdate = true;
      }
      if (this.sideIM.instanceColor && this.trailSideIM.instanceColor) {
        this.trailSideIM.instanceColor.array.set(this.sideIM.instanceColor.array);
        this.trailSideIM.instanceColor.needsUpdate = true;
      }
      // Show trail
      this.trailTopIM.visible = true;
      this.trailSideIM.visible = true;
      // Reset any previous timer
      if (this.trailTimer) { clearTimeout(this.trailTimer); this.trailTimer = null; }
      // Auto-hide after delayMs
      this.trailTimer = setTimeout(() => {
        this.trailTimer = null;
        this.trailTopIM.visible = false;
        this.trailSideIM.visible = false;
      }, Math.max(0, delayMs | 0));
    },
    
    onToggleChunkColors() {
      this.applyChunkColors(!!this.features.chunkColors);
    },
    onToggleRadialFade() {
      // Force materials to recompile if toggled on after init
      if (this.topIM && this.sideIM && this.topIM.material && this.sideIM.material) {
        const topMat = this.topIM.material;
        const sideMat = this.sideIM.material;
        if (this.radialFade.enabled) {
          // Inject if missing
          if (!this._fadeUniforms || !this._fadeUniforms.top) this.setupRadialFade(topMat, 'top');
          if (!this._fadeUniforms || !this._fadeUniforms.side) this.setupRadialFade(sideMat, 'side');
        }
        // Trigger refresh either way
        topMat.needsUpdate = true;
        sideMat.needsUpdate = true;
      }
    },
  // Ensure slider changes also trigger any runtime effects where needed
  // WorldMap rendering reacts to values each frame via uniforms; here we only persist
    
    applyChunkColors(enabled) {
      if (!this.topIM || !this.sideIM || !this.indexToQR) return;
      const count = this.indexToQR.length;
      const tmpColor = new THREE.Color();
      const tmpSide = new THREE.Color();
      for (let i = 0; i < count; i += 1) {
        const info = this.indexToQR[i];
        if (!info) continue;
        if (enabled) {
          // Pastel per-chunk
          const c = this.pastelColorForChunk(info.wx || 0, info.wy || 0);
          const s = tmpSide.copy(c).multiplyScalar(0.8);
          this.topIM.setColorAt(i, c);
          this.sideIM.setColorAt(i, s);
        } else {
          // Biome colors
          const cell = this.world ? this.world.getCell(info.q, info.r) : null;
          const c = cell ? cell.colorTop : tmpColor.set(0xffffff);
          const s = cell ? cell.colorSide : tmpSide.copy(c).multiplyScalar(0.85);
          this.topIM.setColorAt(i, c);
          this.sideIM.setColorAt(i, s);
        }
      }
      if (this.topIM.instanceColor) this.topIM.instanceColor.needsUpdate = true;
      if (this.sideIM.instanceColor) this.sideIM.instanceColor.needsUpdate = true;
  // Ensure materials recompile after colors exist so USE_INSTANCING_COLOR is enabled
  if (this.topIM.material) this.topIM.material.needsUpdate = true;
  if (this.sideIM.material) this.sideIM.material.needsUpdate = true;
    },
    // Generate a stable pastel color per chunk coordinate (wx, wy)
    pastelColorForChunk(wx, wy) {
      const seed = Math.sin(wx * 12.9898 + wy * 78.233) * 43758.5453;
      const h = (seed - Math.floor(seed));
      const s = 0.45; const l = 0.68;
      const c = new THREE.Color();
      c.setHSL(h, s, l);
      return c;
    },
    // Convert even-q offset (col,row) to axial (q,r)
    offsetToAxial(col, row) {
      const q = col;
      const r = row - Math.floor(col / 2);
      return { q, r };
    },
    // Convert axial (q,r) to even-q offset (col,row)
    axialToOffset(q, r) {
      const col = q;
      const row = r + Math.floor(q / 2);
      return { col, row };
    },
    // Determine chunk (wx, wy) for axial coordinates
    chunkForAxial(q, r) {
      const { col, row } = this.axialToOffset(q, r);
      const wx = Math.floor(col / this.chunkCols);
      const wy = Math.floor(row / this.chunkRows);
      return { wx, wy };
    },
    // Fill one chunk slot with instances for world chunk (wx, wy)
    fillChunk(slotIndex, wx, wy) {
      if (!this.topIM || !this.sideIM) return;
      const layoutRadius = this.layoutRadius;
      const hexWidth = layoutRadius * 1.5 * this.spacingFactor;
      const hexHeight = Math.sqrt(3) * layoutRadius * this.spacingFactor;
      const sx = this.modelScaleFactor;
      const xzScale = sx * this.contactScale;
      const baseCol = wx * this.chunkCols;
      const baseRow = wy * this.chunkRows;
      const startIdx = slotIndex * this.countPerChunk;
      let local = 0;
      const useChunkColors = !!this.features.chunkColors;
      const cTop = this.pastelColorForChunk(wx, wy);
      const cSide = cTop.clone().multiplyScalar(0.8);
      const dummy = new THREE.Object3D();
      for (let row = 0; row < this.chunkRows; row += 1) {
        for (let col = 0; col < this.chunkCols; col += 1) {
          const gCol = baseCol + col;
          const gRow = baseRow + row;
          const { q, r } = this.offsetToAxial(gCol, gRow);
          const x = hexWidth * q;
          const z = hexHeight * (r + q / 2);
          const cell = this.world ? this.world.getCell(q, r) : null;
          dummy.position.set(x, 0, z);
          dummy.rotation.set(0, 0, 0);
          dummy.scale.set(xzScale, sx * (cell ? cell.yScale : 1.0), xzScale);
          dummy.updateMatrix();
          const instIdx = startIdx + local;
          this.topIM.setMatrixAt(instIdx, dummy.matrix);
          this.sideIM.setMatrixAt(instIdx, dummy.matrix);
          if (useChunkColors) {
            this.topIM.setColorAt(instIdx, cTop);
            this.sideIM.setColorAt(instIdx, cSide);
          } else {
            const topC = cell ? cell.colorTop : cTop;
            const sideC = cell ? cell.colorSide : cSide;
            this.topIM.setColorAt(instIdx, topC);
            this.sideIM.setColorAt(instIdx, sideC);
          }
          this.indexToQR[instIdx] = { q, r, wx, wy, col: gCol, row: gRow };
          local += 1;
        }
      }
    },
    // Position 3x3 chunk neighborhood around a center (wx, wy)
    setCenterChunk(wx, wy) {
  // Snapshot current visible neighborhood to trail before switching
  this.snapshotTrailAndArmClear(3000);
  this.centerChunk.x = wx; this.centerChunk.y = wy;
      if (!this.topIM || !this.sideIM) return;
      // Fill each of 9 slots in fixed order
      for (let s = 0; s < this.neighborOffsets.length; s += 1) {
        const off = this.neighborOffsets[s];
        this.fillChunk(s, wx + off.dx, wy + off.dy);
      }
      this.topIM.instanceMatrix.needsUpdate = true;
      this.sideIM.instanceMatrix.needsUpdate = true;
      if (this.topIM.instanceColor) this.topIM.instanceColor.needsUpdate = true;
      if (this.sideIM.instanceColor) this.sideIM.instanceColor.needsUpdate = true;
  // Refresh materials to pick up instanced color defines
  if (this.topIM.material) this.topIM.material.needsUpdate = true;
  if (this.sideIM.material) this.sideIM.material.needsUpdate = true;
    },
    init() {
      const width = this.$refs.sceneContainer.clientWidth;
      const height = this.$refs.sceneContainer.clientHeight;

      this.scene = markRaw(new THREE.Scene());
      this.camera = markRaw(new THREE.PerspectiveCamera(60, width / height, 0.1, 1000));
      this.camera.position.set(0, 20, 20);
      this.camera.lookAt(0, 0, 0);

      const camVec = this.camera.position.clone().sub(this.orbit.target);
      this.orbit.radius = camVec.length();
      this.orbit.theta = Math.atan2(camVec.x, camVec.z);
      this.orbit.phi = Math.acos(camVec.y / this.orbit.radius);

      this.renderer = markRaw(new THREE.WebGLRenderer({ antialias: false }));
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

      this.composer = markRaw(new EffectComposer(this.renderer));
      const renderPass = new RenderPass(this.scene, this.camera);
      this.composer.addPass(renderPass);

      const pr = this.renderer.getPixelRatio();

      this.fxaaPass = markRaw(new ShaderPass(FXAAShader));
      this.fxaaPass.material.uniforms.resolution.value.set(1 / (width * pr), 1 / (height * pr));
      this.composer.addPass(this.fxaaPass);
      

      this.ambientLight = markRaw(new THREE.AmbientLight(0xffffff, 0.4));
      this.keyLight = markRaw(new THREE.DirectionalLight(0xffffff, 1.0));
      this.keyLight.position.set(22, 40, 28);
      this.scene.add(this.ambientLight, this.keyLight);
      // Apply initial feature toggles
      this.applyShadows(this.features.shadows);

      // Wheel zoom
      this.onWheel = this.onWheel.bind(this);
      this.$refs.sceneContainer.addEventListener('wheel', this.onWheel, { passive: false });

      // Init world data and auxiliary systems
      this.world = markRaw(new WorldGrid({
        layoutRadius: this.layoutRadius,
        gridSize: this.gridSize,
        elevation: this.elevation,
        terrainShape: this.terrainShape,
      }));
      this.clutter = markRaw(new ClutterManager());

      this.loadModel();
      this.animate = this.animate.bind(this);
      this.animate();
    },
    loadModel() {
      const loader = new GLTFLoader();
      loader.load('/models/hex-can.glb', (gltf) => {
        this.hexModel = markRaw(gltf.scene);
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
            if (name.includes('top')) this.topGeom = markRaw(g); else this.sideGeom = markRaw(g);
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
        this.createChunkGrid();
      }, undefined, (err) => {
        console.error('[WorldMap] Failed to load /models/hex-can.glb', err);
      });
    },
    createChunkGrid() {
      if (!this.topGeom || !this.sideGeom) return;
      const layoutRadius = this.layoutRadius;
      const hexWidth = layoutRadius * 1.5 * this.spacingFactor;
      const hexHeight = Math.sqrt(3) * layoutRadius * this.spacingFactor;
      const sx = this.modelScaleFactor;
      const xzScale = sx * this.contactScale;
      // Prepare instancing
      this.countPerChunk = this.chunkCols * this.chunkRows;
      const total = 9 * this.countPerChunk;
      const topMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
      const sideMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
      // Inject radial fade into terrain materials (gated by uniform uFadeEnabled)
      this.setupRadialFade(topMat, 'top');
      this.setupRadialFade(sideMat, 'side');
      this.topIM = markRaw(new THREE.InstancedMesh(this.topGeom, topMat, total));
      this.sideIM = markRaw(new THREE.InstancedMesh(this.sideGeom, sideMat, total));
      this.topIM.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.sideIM.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      // Pre-create instanceColor attributes to avoid white/black flashes and ensure flags
      const colorsTop = new Float32Array(total * 3);
      const colorsSide = new Float32Array(total * 3);
      this.topIM.instanceColor = new THREE.InstancedBufferAttribute(colorsTop, 3);
      this.sideIM.instanceColor = new THREE.InstancedBufferAttribute(colorsSide, 3);
      this.indexToQR = new Array(total);
      this.scene.add(this.sideIM);
      this.scene.add(this.topIM);
      // Trail instancers (reuse same materials so fade applies consistently)
      this.trailTopIM = markRaw(new THREE.InstancedMesh(this.topGeom, topMat, total));
      this.trailSideIM = markRaw(new THREE.InstancedMesh(this.sideGeom, sideMat, total));
      this.trailTopIM.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.trailSideIM.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      const tColorsTop = new Float32Array(total * 3);
      const tColorsSide = new Float32Array(total * 3);
      this.trailTopIM.instanceColor = new THREE.InstancedBufferAttribute(tColorsTop, 3);
      this.trailSideIM.instanceColor = new THREE.InstancedBufferAttribute(tColorsSide, 3);
      this.trailTopIM.visible = false;
      this.trailSideIM.visible = false;
      this.trailTopIM.renderOrder = (this.topIM.renderOrder || 0) - 1;
      this.trailSideIM.renderOrder = (this.sideIM.renderOrder || 0) - 1;
      this.scene.add(this.trailSideIM);
      this.scene.add(this.trailTopIM);
      // Picking targets
      this.pickMeshes = [this.topIM, this.sideIM];
      // Defer water for chunks for now (mask mapping needs redesign)
      // Initialize center and fill chunks
      this.setCenterChunk(this.centerChunk.x, this.centerChunk.y);
      // Ensure colors are applied based on current toggle at startup
      this.applyChunkColors(!!this.features.chunkColors);

      // Compute a sensible default radius for radial fade based on current 3x3 chunk extents
      // Create a tan underlay plane to show through where hexes are discarded by the radial fade
      if (!this.fadeUnderlay) {
        const planeSize = (this.chunkCols * this.layoutRadius * this.spacingFactor * 8);
        const geom = new THREE.PlaneGeometry(planeSize, planeSize, 1, 1);
        geom.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({ color: 0xF3EED9, transparent: true, opacity: 1.0, depthWrite: false });
        const plane = new THREE.Mesh(geom, mat);
        // Place slightly below the minimum terrain height
        const y = Math.max(0.02 * this.hexMaxY * this.modelScaleFactor, 0.05);
        plane.position.y = y;
        plane.renderOrder = -1;
        plane.frustumCulled = false;
        plane.receiveShadow = false;
        plane.castShadow = false;
        this.scene.add(plane);
        this.fadeUnderlay = plane;
      }

      if (this.radialFade) {
        const totalCols = this.chunkCols * 3;
        const totalRows = this.chunkRows * 3;
        const halfW = 0.5 * hexWidth * Math.max(1, (totalCols - 1));
        const halfH = 0.5 * hexHeight * Math.max(1, (totalRows - 1));
        // Start fade well inside edges (~60% of min half-extent) so it's clearly visible
        const inner = 0.60 * Math.min(halfW, halfH);
        const minRadius = Math.max(2.0 * this.layoutRadius, hexHeight * 1.5);
        this.radialFade.radius = Math.max(minRadius, inner);
        // Keep width reasonable in world units
        const minWidth = Math.max(hexHeight * 1.5, this.layoutRadius * 1.0);
        this.radialFade.width = Math.max(minWidth, this.radialFade.width || 0.0);
        // Initialize fade center to current camera target
        if (!this._fadeUniforms) this._fadeUniforms = {};
      }

      // Initial spawn: center of the center chunk (1,1)
      const spawnWx = 1; const spawnWy = 1;
      if (spawnWx !== this.centerChunk.x || spawnWy !== this.centerChunk.y) {
        this.setCenterChunk(spawnWx, spawnWy);
      }
      const midCol = spawnWx * this.chunkCols + Math.floor(this.chunkCols / 2);
      const midRow = spawnWy * this.chunkRows + Math.floor(this.chunkRows / 2);
      const { q: startQ, r: startR } = this.offsetToAxial(midCol, midRow);
      let startIdx = null;
      for (let iSearch = 0; iSearch < this.indexToQR.length; iSearch += 1) {
        const info = this.indexToQR[iSearch];
        if (info && info.q === startQ && info.r === startR) { startIdx = iSearch; break; }
      }
      if (startIdx != null) {
        this.addLocationMarkerAtIndex(startIdx);
        this.focusCameraOnIndex(startIdx, { smooth: true, duration: 900 });
      }
    },
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

      this.scene = markRaw(new THREE.Scene());
      this.camera = markRaw(new THREE.PerspectiveCamera(60, width / height, 0.1, 1000));
      this.camera.position.set(0, 20, 20);
      this.camera.lookAt(0, 0, 0);

      const camVec = this.camera.position.clone().sub(this.orbit.target);
      this.orbit.radius = camVec.length();
      this.orbit.theta = Math.atan2(camVec.x, camVec.z);
      this.orbit.phi = Math.acos(camVec.y / this.orbit.radius);

      this.renderer = markRaw(new THREE.WebGLRenderer({ antialias: false }));
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

      this.composer = markRaw(new EffectComposer(this.renderer));
      const renderPass = new RenderPass(this.scene, this.camera);
      this.composer.addPass(renderPass);

      const pr = this.renderer.getPixelRatio();

      this.fxaaPass = markRaw(new ShaderPass(FXAAShader));
      this.fxaaPass.material.uniforms.resolution.value.set(1 / (width * pr), 1 / (height * pr));
      this.composer.addPass(this.fxaaPass);
      

      this.ambientLight = markRaw(new THREE.AmbientLight(0xffffff, 0.4));
      this.keyLight = markRaw(new THREE.DirectionalLight(0xffffff, 1.0));
      this.keyLight.position.set(22, 40, 28);
      this.scene.add(this.ambientLight, this.keyLight);
      // Apply initial feature toggles
      this.applyShadows(this.features.shadows);

      // Wheel zoom
      this.onWheel = this.onWheel.bind(this);
      this.$refs.sceneContainer.addEventListener('wheel', this.onWheel, { passive: false });

      // Init world data and auxiliary systems
      this.world = markRaw(new WorldGrid({
        layoutRadius: this.layoutRadius,
        gridSize: this.gridSize,
        elevation: this.elevation,
        terrainShape: this.terrainShape,
      }));
      this.clutter = markRaw(new ClutterManager());

      this.loadModel();
      this.animate = this.animate.bind(this);
      this.animate();
    },
    loadModel() {
      const loader = new GLTFLoader();
      loader.load('/models/hex-can.glb', (gltf) => {
        this.hexModel = markRaw(gltf.scene);
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
            if (name.includes('top')) this.topGeom = markRaw(g); else this.sideGeom = markRaw(g);
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
        this.createChunkGrid();
      }, undefined, (err) => {
        console.error('[WorldMap] Failed to load /models/hex-can.glb', err);
      });
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
      this.waterMaskTex = markRaw(tex);

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

      // 3) Single large planes spanning the map
      const planeSize = (this.gridSize * this.layoutRadius * this.spacingFactor * 4);
      const geom = new THREE.PlaneGeometry(planeSize * 3, planeSize * 3, 1, 1);
      geom.rotateX(-Math.PI / 2);

      // Simple sand underlay to avoid black background
      const sandGeom = geom.clone();
      const sandMat = new THREE.MeshBasicMaterial({ color: 0xD7C49E, transparent: true, opacity: 1.0, depthWrite: false });
      const sand = markRaw(new THREE.Mesh(sandGeom, sandMat));
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
      this.waterMaterial = markRaw(mat);
      const mesh = markRaw(new THREE.Mesh(geom, mat));
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
    },
    // Ensure the GLB location marker is loaded and normalized.
    ensureLocationMarkerLoaded(cb) {
      if (this.locationMarker) { cb && cb(); return; }
      const loader = new GLTFLoader();
      loader.load('/models/location-marker.glb', (gltf) => {
        const marker = markRaw(gltf.scene);
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
