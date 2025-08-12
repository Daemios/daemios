<template>
  <div
    ref="sceneContainer"
    class="world-map position-relative w-100 h-screen"
  >
    <!-- Current tile panel (left) -->
    <TileInfoPanel
      :tile="currentTileInfo"
      :seed="worldSeed"
      class="position-absolute"
      style="left: 6px; top: 28px; z-index: 3; min-width: 240px; max-width: 320px;"
    />
    <!-- Debug overlay -->
    <WorldDebugPanel
      v-if="debug.show"
      :features="features"
      :radial-fade="radialFade"
      :generation="generation"
      :benchmark="benchmark"
      :stats-visible="profilerEnabled"
      :generator-versions="generatorVersions"
      class="position-absolute"
      style="right: 6px; top: 28px;"
      @update:features="features = $event"
      @update:radialFade="radialFade = $event"
      @update:generation="generation = $event"
      @toggle-clutter="onToggleClutter"
      @toggle-shadows="onToggleShadows"
      @toggle-water="onToggleWater"
      @toggle-chunk-colors="onToggleChunkColors"
      @toggle-directions="onToggleDirections"
      @toggle-radial-fade="onToggleRadialFade"
      @generation-scale-change="onGenerationScaleChange"
      @generator-tuning-change="onGeneratorTuningChange"
      @generator-version-change="onGeneratorVersionChange"
      @toggle-stats-pane="onToggleStatsPane"
      @set-neighborhood-radius="onSetNeighborhoodRadius"
      @run-benchmark="runBenchmark"
      @create-town="onCreateTown"
    />
    <WorldBenchmarkPanel
      ref="worldBenchmarkPanel"
      :general-stats="benchmarkPanelGeneral"
      :chunk-stats="benchmarkPanelChunk"
    />
  </div>
</template>

<script>
import { markRaw } from 'vue';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import api from '@/functions/api';
import { BIOME_THRESHOLDS } from '@/3d/terrain/biomes';
import WorldGrid from '@/3d/world/WorldGrid';
import PlayerMarker from '@/3d/renderer/PlayerMarker';
import ClutterManager from '@/3d/world/ClutterManager';
import createRealisticWaterMaterial from '@/3d/renderer/materials/RealisticWaterMaterial';
import { useSettingsStore } from '@/stores/settingsStore';
import { updateRadialFadeUniforms } from '@/3d/renderer/radialFade';
import ChunkManager from '@/3d/renderer/ChunkManager';
import WorldDebugPanel from '@/components/world/WorldDebugPanel.vue';
import { profiler, createWebGLTimer } from '@/utils/profiler';
import { useWorldStore } from '@/stores/worldStore';
import { availableWorldGenerators } from '@/3d/world/generation';
import TileInfoPanel from '@/components/world/TileInfoPanel.vue';
import WorldBenchmarkPanel from '@/components/general/WorldBenchmarkPanel.vue';

export default {
  name: 'WorldMap',
  components: { TileInfoPanel, WorldDebugPanel, WorldBenchmarkPanel },
  data() {
    const generatorVersions = availableWorldGenerators();
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
  // Track if we've seeded the initial player spawn to avoid re-centering on rebuilds
  playerSpawnSeeded: false,
  recenterTimer: null,
  pendingCenterChunk: null,
  // Trail layer to keep previous chunk neighborhood visible briefly
  trailTopIM: null,
  trailSideIM: null,
  trailTimer: null,
  // Keep previous neighborhood bounds for clutter persistence during trail visibility
  _prevNeighborhoodRect: null,
  neighborhood: null, // kept for compatibility; managed by chunkManager
  chunkManager: null,
  // Water
  waterMesh: null,
  waterMaterial: null,
  // Always use realistic water
  waterSeabedTex: null,
  waterMaskTex: null,
  waterCoverageTex: null,
  waterDistanceTex: null,
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
  _tmpColorTop: markRaw(new THREE.Color()),
  _tmpColorSide: markRaw(new THREE.Color()),
  clutterCommitTimer: null,

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
  heightMagnitude: 2.0, // global vertical exaggeration (e.g., 2x)
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
  sideInset: 0.996, // shrink side XZ a hair to avoid coplanar overlap between neighbors

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
      // profiler
      profilerEnabled: true,
      profEl: null,
      _profLastUpdate: 0,
      _gpuTimer: null,
      // benchmark
      benchmark: {
        running: false,
        startedAt: 0,
        durationMs: 10000,
        frames: 0,
        sum: 0,
        min: Infinity,
        max: -Infinity,
        result: null,
      },

  // Post FX
  
  // Debug / Features (defaults; will be overridden from settings if present)
  debug: { show: true },
  features: { shadows: true, water: true, chunkColors: true, clutter: true },
  // Directions helper overlay
  _dirOverlay: null,
  radialFade: { enabled: false, color: 0xF3EED9, radius: 0, width: 5.0, minHeightScale: 0.05 },
  generation: { version: generatorVersions[0] || 'hex', scale: 1.0, radius: 5, tuning: { continentScale: 1.0, warpScale: 1.0, warpStrength: 0.75, plateSize: 1.15, ridgeScale: 0.85, detailScale: 1.0, climateScale: 1.0, oceanEncapsulation: 0.75, seaBias: 0.0 } },
  generatorVersions,
  worldSeed: 1337,
  // Progressive neighborhood expansion control
  _progressiveModeActive: false, // when true, skip progressive start on rebuilds
  _progressivePlanned: 0,
  _progressiveCheckId: null,
  
  // Rendering toggles
  // Default chunkColors: true (use per-chunk pastel overrides)
  // The object above is initialized in data(); extend it here for clarity

  // Lights
  ambientLight: null,
  keyLight: null,
  // stores
  settings: null,
  worldStore: null,
  // selection
  selectedQR: { q: null, r: null },
    };
  },
  computed: {
    currentTileInfo() {
      const q = this.selectedQR?.q; const r = this.selectedQR?.r;
      if (q == null || r == null || !this.world) return null;
      const cell = this.world.getCell(q, r);
      const { x, z } = this.getTileWorldPos(q, r);
      const off = this.axialToOffset ? this.axialToOffset(q, r) : { col: null, row: null };
      const ch = this.chunkForAxial ? this.chunkForAxial(q, r) : { wx: null, wy: null };
      return { q, r, world: { x, z }, col: off.col, row: off.row, wx: ch.wx, wy: ch.wy, cell };
    },
    benchmarkPanelGeneral() {
      const b = this.benchmark || {};
      let stats = '';
      stats += `cpu ${this.fmt(b.cpu, 2)}ms (last ${this.fmt(b.cpuLast, 2)}ms)\n`;
      stats += `gpu ${this.fmt(b.gpu, 2)}ms (last ${this.fmt(b.gpuLast, 2)}ms)\n`;
      stats += `render ${this.fmt(b.render, 2)}ms\n`;
      stats += `fadeU ${this.fmt(b.fadeU, 2)}µs\n`;
      stats += `tween ${this.fmt(b.tween, 2)}µs\n`;
      stats += `waterU ${this.fmt(b.waterU, 2)}µs\n`;
      stats += `stream ${this.fmt(b.stream, 2)}ms\n`;
      stats += `slice ${this.fmt(b.slice, 2)}ms\n`;
      stats += `queue.total ${this.fmt(b.queueTotal, 2)}ms\n`;
      stats += `  ${b.queueCount || ''}/${b.queueMax || ''}  ${this.fmt(b.queueRate, 1)}t/s  eta ${this.fmt(b.queueEta, 2)}ms\n`;
      stats += `chunk ${this.fmt(b.chunk, 2)}ms (last ${this.fmt(b.chunkLast, 2)}ms)\n`;
      stats += `  cell ${this.fmt(b.cell, 2)}ms  matrix ${this.fmt(b.matrix, 2)}ms  color ${this.fmt(b.color, 2)}ms\n`;
      stats += `dc ${b.dc || ''}  tris ${b.tris || ''}\n`;
      stats += `startup mount ${this.fmt(b.mount, 2)}ms  router ${this.fmt(b.router, 2)}ms  init0 ${this.fmt(b.init0, 2)}ms  init1 ${this.fmt(b.init1, 2)}ms\n`;
      stats += `        hex ${this.fmt(b.hex, 2)}ms  chunk ${this.fmt(b.chunkTotal, 2)}ms  frame ${this.fmt(b.frame, 2)}ms  content ${this.fmt(b.content, 2)}ms\n`;
      stats += `inst ${b.inst || ''}/${b.instMax || ''}`;
      return stats;
    },
    benchmarkPanelChunk() {
      const b = this.benchmark || {};
      let stats = '';
      stats += `chunk ${this.fmt(b.chunk, 2)}ms (last ${this.fmt(b.chunkLast, 2)}ms)\n`;
      stats += `  cell ${this.fmt(b.cell, 2)}ms  matrix ${this.fmt(b.matrix, 2)}ms  color ${this.fmt(b.color, 2)}ms\n`;
      stats += `queue.total ${this.fmt(b.queueTotal, 2)}ms\n`;
      stats += `  ${b.queueCount || ''}/${b.queueMax || ''}  ${this.fmt(b.queueRate, 1)}t/s  eta ${this.fmt(b.queueEta, 2)}ms\n`;
      stats += `  done ${b.queueDone || ''}/${b.queueTasks || ''}\n`;
      stats += `inst ${b.inst || ''}/${b.instMax || ''}`;
      return stats;
    },
  },
  mounted() {
    // pinia stores
    this.settings = useSettingsStore();
  this.worldStore = useWorldStore();
    this.$watch(
      () => this.worldStore?.worldSeed,
      (seed) => {
        if (typeof seed === 'number') this.worldSeed = seed;
      },
      { immediate: true },
    );
    // Startup marker for this view
    try {
      if (typeof window !== 'undefined') {
        if (!window.__DAEMIOS_STARTUP) window.__DAEMIOS_STARTUP = { t0: (performance.now?.() ?? Date.now()) };
        window.__DAEMIOS_STARTUP.worldMapMounted = (performance.now?.() ?? Date.now());
      }
    } catch (e) {}
    // Expose a tiny timing hook for modules that don't import the profiler directly
    if (typeof window !== 'undefined') {
      window.__DAEMIOS_PROF = (label, ms) => { try { if (this.profilerEnabled) profiler.push(label, ms); } catch (e) {} };
    }
    // Load persisted settings for this view (header: settings.worldMap)
    try {
      const saved = this.settings.get('worldMap', null);
      if (saved && typeof saved === 'object') {
        if (saved.debug && typeof saved.debug === 'object') Object.assign(this.debug, saved.debug);
        if (saved.features && typeof saved.features === 'object') Object.assign(this.features, saved.features);
        if (saved.radialFade && typeof saved.radialFade === 'object') Object.assign(this.radialFade, saved.radialFade);
        if (saved.generation && typeof saved.generation === 'object') Object.assign(this.generation, saved.generation);
        if (!this.generation.version) this.generation.version = this.generatorVersions[0];
        if (typeof saved.worldSeed === 'number') this.worldSeed = saved.worldSeed;
      }
    } catch (e) { /* noop */ }
    // Persist any changes back to settings
    this.$watch(() => ({
      debug: this.debug,
      features: this.features,
      radialFade: this.radialFade,
      generation: this.generation,
      worldSeed: this.worldSeed,
    }), (val) => {
      if (this.settings && this.settings.mergeAtPath) {
        this.settings.mergeAtPath({ path: 'worldMap', value: val });
      }
    }, { deep: true, immediate: true });

    // Recompute clutter when radial fade parameters change so props respect the boundary live
    this.$watch(() => this.radialFade, () => {
      this.scheduleClutterCommit(120);
    }, { deep: true });

    // Rebuild world if the seed changes after initialization
    this.$watch(
      () => this.worldSeed,
      (seed, prev) => {
        if (typeof seed === 'number' && seed !== prev && this.world) {
          this.world = markRaw(new WorldGrid({
            layoutRadius: this.layoutRadius,
            gridSize: this.gridSize,
            elevation: this.elevation,
            terrainShape: this.terrainShape,
            seed,
            generationScale: this.generation.scale,
            generatorVersion: this.generation.version,
          }));
          if (this.clutter) this.clutter.worldSeed = seed;
          this.playerSpawnSeeded = false;
          this.rebuildChunkGrid();
        }
      },
    );

    this.init();
    // Load towns list on map load
    try { if (this.worldStore && this.worldStore.fetchTowns) this.worldStore.fetchTowns(); } catch (e) { /* noop */ }
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
    // Small number formatter for panel
    fmt(v, n = 3) { if (v == null || Number.isNaN(v)) return '—'; const x = Number(v); return Math.abs(x) < 1e-6 ? '0' : x.toFixed(n); },
    flagsList(flags) {
      if (!flags || typeof flags !== 'object') return '—';
      const on = Object.keys(flags).filter((k) => !!flags[k]);
      return on.length ? on.join(',') : 'none';
    },
    onToggleStatsPane() {
      this.profilerEnabled = !this.profilerEnabled;
      if (this.profEl) this.profEl.style.display = this.profilerEnabled ? 'block' : 'none';
    },
    setCurrentTile(q, r) {
      if (q == null || r == null) { this.selectedQR.q = null; this.selectedQR.r = null; return; }
      this.selectedQR.q = q; this.selectedQR.r = r;
    },
    // Find any instanced index for a given q,r (linear scan; fast enough for panel)
    findIndexForQR(q, r) {
      if (!this.indexToQR) return null;
      for (let i = 0; i < this.indexToQR.length; i += 1) {
        const info = this.indexToQR[i];
        if (info && info.q === q && info.r === r) return i;
      }
      return null;
    },
    async onCreateTown() {
      try {
        if (!this.worldStore) this.worldStore = useWorldStore();
        await this.worldStore.createTown();
        // For now, log the count
        const n = Array.isArray(this.worldStore.towns) ? this.worldStore.towns.length : 0;
        console.info(`[World] Town created. Total towns: ${n}`);
      } catch (e) {
        console.error('Failed to create town', e);
      }
    },
  // Helper: commit clutter for current visible chunk neighborhood and current fade
    commitClutterForNeighborhood() {
      if (!this.clutter || !this.world) return;
      const layoutRadius = this.layoutRadius;
      const contactScale = this.contactScale;
      const hexMaxY = this.hexMaxY;
      const modelScaleY = (q, r) => {
        const c = this.world.getCell(q, r);
        return this.modelScaleFactor * (c ? c.yScale : 1) * (this.heightMagnitude != null ? this.heightMagnitude : 1.0);
      };
  // Compute offset rect of the active neighborhood (radius derived from neighborOffsets)
  const radius = this._neighborRadius != null ? this._neighborRadius : 1;
  const curr = {
        colMin: (this.centerChunk.x - radius) * this.chunkCols,
        rowMin: (this.centerChunk.y - radius) * this.chunkRows,
        colMax: (this.centerChunk.x + radius) * this.chunkCols + (this.chunkCols - 1),
        rowMax: (this.centerChunk.y + radius) * this.chunkRows + (this.chunkRows - 1),
      };
  // If a previous neighborhood exists and trail is visible, union the rect so clutter persists under trail
  // Only union for small (radius=1) neighborhoods. For expanded (10x) neighborhoods,
  // unioning dramatically increases work and can freeze the main thread.
  const shouldUnion = (radius === 1) && (this.trailTopIM && this.trailTopIM.visible && this._prevNeighborhoodRect);
  const rect = shouldUnion
        ? {
            colMin: Math.min(curr.colMin, this._prevNeighborhoodRect.colMin),
            rowMin: Math.min(curr.rowMin, this._prevNeighborhoodRect.rowMin),
            colMax: Math.max(curr.colMax, this._prevNeighborhoodRect.colMax),
            rowMax: Math.max(curr.rowMax, this._prevNeighborhoodRect.rowMax),
          }
        : curr;
  // No pre-cull by fade; generate for the union area and let clutter shader handle visibility
  const filter = undefined;
      this.clutter.commitInstances({
        layoutRadius,
        contactScale,
        hexMaxY,
        modelScaleY,
        filter,
  offsetRect: rect,
      });
      this.clutter.setEnabled(!!this.features.clutter);
    },
    // Debounced clutter commit to avoid spamming during slider drags
    scheduleClutterCommit(delayMs = 120) {
      if (this.clutterCommitTimer) { clearTimeout(this.clutterCommitTimer); this.clutterCommitTimer = null; }
      this.clutterCommitTimer = setTimeout(() => {
        this.clutterCommitTimer = null;
        // Prefer ChunkManager's commit (unions with trail correctly)
        if (this.chunkManager && this.chunkManager.commitClutterForNeighborhood) {
          this.chunkManager.commitClutterForNeighborhood();
        } else {
          this.commitClutterForNeighborhood();
        }
      }, Math.max(0, delayMs | 0));
    },
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
            // Only compress height for SIDE bucket to keep top face glued to clutter
            #ifdef TOP_BUCKET
            // no height change for top; preserve contact with clutter
            #else
              transformed.y = mix(transformed.y, transformed.y * uMinHeightScale, f_v);
            #endif
          `)
          // Use the locally computed wpos_pre to avoid relying on worldPosition symbol
          .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n  vWorldPos = wpos_pre.xyz;');
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
    setupRadialFadeDepth(mat, bucketKey) {
      const self = this;
      /* eslint-disable no-param-reassign */
      mat.onBeforeCompile = (shader) => {
        shader.uniforms.uFadeCenter = { value: new THREE.Vector2(0, 0) };
        shader.uniforms.uFadeRadius = { value: self.radialFade.radius };
        shader.uniforms.uFadeWidth = { value: self.radialFade.width };
        shader.uniforms.uFadeEnabled = { value: self.radialFade.enabled ? 1 : 0 };
        shader.uniforms.uMinHeightScale = { value: self.radialFade.minHeightScale != null ? self.radialFade.minHeightScale : 0.05 };
        shader.uniforms.uCullWholeHex = { value: 1 };
        shader.uniforms.uHexCornerRadius = { value: self.layoutRadius * self.contactScale };
        const vertDecl = '\n uniform vec2 uFadeCenter; uniform float uFadeRadius; uniform float uFadeWidth; uniform int uFadeEnabled; uniform float uMinHeightScale; uniform int uCullWholeHex; uniform float uHexCornerRadius;\n varying vec3 vWorldPos; varying vec3 vInstCenter;\n';
        shader.vertexShader = vertDecl + shader.vertexShader
          .replace('#include <begin_vertex>', `#include <begin_vertex>
            mat4 imat = mat4(1.0);
            #ifdef USE_INSTANCING
              imat = instanceMatrix;
            #endif
            vec4 wcenter = modelMatrix * imat * vec4(0.0, 0.0, 0.0, 1.0);
            vInstCenter = wcenter.xyz;
            vec4 wpos_pre = modelMatrix * imat * vec4(transformed, 1.0);
            float distXZ_v = length(wpos_pre.xz - vec2(uFadeCenter.x, uFadeCenter.y));
            float inner_v = max(0.0, uFadeRadius - uFadeWidth);
            float f_v = float(uFadeEnabled) * smoothstep(inner_v, uFadeRadius, distXZ_v);
            transformed.y = mix(transformed.y, transformed.y * uMinHeightScale, f_v);
          `)
          .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n  vWorldPos = wpos_pre.xyz;');
        const fadeDecl = '\n uniform vec2 uFadeCenter; uniform float uFadeRadius; uniform float uFadeWidth; uniform int uFadeEnabled; uniform float uMinHeightScale; uniform int uCullWholeHex; uniform float uHexCornerRadius;\n varying vec3 vWorldPos; varying vec3 vInstCenter;\n';
        const injectFrag = `
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
        `;
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', '#include <common>' + fadeDecl)
          .replace('#include <dithering_fragment>', `${injectFrag}\n#include <dithering_fragment>`);
        if (!self._fadeUniformsDepth) self._fadeUniformsDepth = {};
        self._fadeUniformsDepth[bucketKey] = shader.uniforms;
      };
      mat.needsUpdate = true;
      /* eslint-enable no-param-reassign */
    },
    snapshotTrailAndArmClear(delayMs = 3000) {
      if (!this.topIM || !this.sideIM || !this.trailTopIM || !this.trailSideIM) return;
      // Cancel any in-progress trail copy job (legacy streaming path)
      if (this._trailCopy && this._trailCopy.cancel) { try { this._trailCopy.cancel(); } catch (e) {} this._trailCopy = null; }
      // Capture current neighborhood rect so clutter can persist under the trail
      if (this._neighborRadius != null && this.centerChunk) {
        const r = this._neighborRadius;
        this._prevNeighborhoodRect = {
          colMin: (this.centerChunk.x - r) * this.chunkCols,
          rowMin: (this.centerChunk.y - r) * this.chunkRows,
          colMax: (this.centerChunk.x + r) * this.chunkCols + (this.chunkCols - 1),
          rowMax: (this.centerChunk.y + r) * this.chunkRows + (this.chunkRows - 1),
        };
      }
      const count = this.topIM.count | 0;
      // Ensure trail counts reflect the snapshot size up-front
      this.trailTopIM.count = count;
      this.trailSideIM.count = count;
      // Show trail immediately
      this.trailTopIM.visible = true;
      this.trailSideIM.visible = true;
      // Perform a synchronous copy of instance data so the trail is ready before any rebuild writes
      try {
        // Matrices
        this.trailTopIM.instanceMatrix.array.set(this.topIM.instanceMatrix.array.subarray(0, count * 16), 0);
        this.trailSideIM.instanceMatrix.array.set(this.sideIM.instanceMatrix.array.subarray(0, count * 16), 0);
        this.trailTopIM.instanceMatrix.needsUpdate = true;
        this.trailSideIM.instanceMatrix.needsUpdate = true;
        // Colors (if present)
        if (this.topIM.instanceColor && this.trailTopIM.instanceColor) {
          this.trailTopIM.instanceColor.array.set(this.topIM.instanceColor.array.subarray(0, count * 3), 0);
          this.trailTopIM.instanceColor.needsUpdate = true;
        }
        if (this.sideIM.instanceColor && this.trailSideIM.instanceColor) {
          this.trailSideIM.instanceColor.array.set(this.sideIM.instanceColor.array.subarray(0, count * 3), 0);
          this.trailSideIM.instanceColor.needsUpdate = true;
        }
      } catch (e) {
        // As a fallback, keep trail visible without colors if copy fails
      }
      // Reset any previous timer
      if (this.trailTimer) { clearTimeout(this.trailTimer); this.trailTimer = null; }
      // Auto-hide after delayMs
      this.trailTimer = setTimeout(() => {
        this.trailTimer = null;
        this.trailTopIM.visible = false;
        this.trailSideIM.visible = false;
  // Clear previous rect so future clutter commits don't include it
  this._prevNeighborhoodRect = null;
        // Inform ChunkManager that the trail is no longer active and clear its union state
        if (this.chunkManager) {
          this.chunkManager.trailActive = false;
          if (typeof this.chunkManager._prevNeighborhoodRect !== 'undefined') this.chunkManager._prevNeighborhoodRect = null;
          if (this.chunkManager.commitClutterForNeighborhood) this.chunkManager.commitClutterForNeighborhood();
        }
        // Cancel any leftover job ref
        if (this._trailCopy && this._trailCopy.cancel) { try { this._trailCopy.cancel(); } catch (e) {} this._trailCopy = null; }
      }, Math.max(0, delayMs | 0));
    },
    // Extend trail visibility without resnapshotting (used when moving again before trail hides)
    extendTrail(delayMs = 3000) {
      if (!this.trailTopIM || !this.trailSideIM) return;
      // Ensure trail stays visible
      this.trailTopIM.visible = true;
      this.trailSideIM.visible = true;
      // Reset timer to hide later
      if (this.trailTimer) { clearTimeout(this.trailTimer); this.trailTimer = null; }
      this.trailTimer = setTimeout(() => {
        this.trailTimer = null;
        this.trailTopIM.visible = false;
        this.trailSideIM.visible = false;
        // Clear previous rect so future clutter commits don't include it
        this._prevNeighborhoodRect = null;
        // Inform ChunkManager and rebuild clutter without union
        if (this.chunkManager) {
          this.chunkManager.trailActive = false;
          if (typeof this.chunkManager._prevNeighborhoodRect !== 'undefined') this.chunkManager._prevNeighborhoodRect = null;
          if (this.chunkManager.commitClutterForNeighborhood) this.chunkManager.commitClutterForNeighborhood();
        }
      }, Math.max(0, delayMs | 0));
    },
    
    onToggleChunkColors() {
      this.applyChunkColors(!!this.features.chunkColors);
    },
    onToggleDirections() {
      const enabled = !!this.features.directions;
      if (enabled) {
        this.showDirectionsOverlay();
      } else {
        this.hideDirectionsOverlay();
      }
    },
    showDirectionsOverlay() {
      if (!this._dirOverlay) {
        const el = document.createElement('div');
        Object.assign(el.style, {
          position: 'absolute', top: '6px', left: '6px', zIndex: 2,
          background: 'rgba(0,0,0,0.45)', color: '#fff', padding: '4px 6px', borderRadius: '4px',
          font: '12px monospace', pointerEvents: 'none'
        });
        el.textContent = 'N↑  E→  S↓  W←';
        this._dirOverlay = el;
      }
      if (this._dirOverlay && !this._dirOverlay.parentElement) this.$refs.sceneContainer.appendChild(this._dirOverlay);
      // Also draw a labeled rectangle around the current neighborhood in the 3D scene using helpers
      this.drawNeighborhoodFrame();
    },
    hideDirectionsOverlay() {
      if (this._dirOverlay && this._dirOverlay.parentElement) this._dirOverlay.parentElement.removeChild(this._dirOverlay);
      this.clearNeighborhoodFrame();
    },
    drawNeighborhoodFrame() {
      // Remove old first
      this.clearNeighborhoodFrame();
      // Compute current visible neighborhood rect in world XZ
      const r = this._neighborRadius != null ? this._neighborRadius : 1;
      const baseCol = (this.centerChunk.x - r) * this.chunkCols;
      const baseRow = (this.centerChunk.y - r) * this.chunkRows;
      const endCol = (this.centerChunk.x + r) * this.chunkCols + (this.chunkCols - 1);
      const endRow = (this.centerChunk.y + r) * this.chunkRows + (this.chunkRows - 1);
      const hexW = this.layoutRadius * 1.5 * this.spacingFactor;
      const hexH = Math.sqrt(3) * this.layoutRadius * this.spacingFactor;
      const tlAx = this.offsetToAxial(baseCol, baseRow);
      const brAx = this.offsetToAxial(endCol, endRow);
      const xTL = hexW * tlAx.q; const zTL = hexH * (tlAx.r + tlAx.q * 0.5);
      const xBR = hexW * brAx.q; const zBR = hexH * (brAx.r + brAx.q * 0.5);
  const y = 0.001;
  // Save coords for label updates
  this._dirFrameCoords = { xTL, zTL, xBR, zBR, y };
      const mat = new THREE.LineBasicMaterial({ color: 0xffcc00 });
      const makeLine = (x1,z1,x2,z2) => {
        const g = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(x1,y,z1), new THREE.Vector3(x2,y,z2)
        ]);
        const l = new THREE.Line(g, mat);
        l.renderOrder = 10; l.frustumCulled = false; return l;
      };
      const lines = [];
      lines.push(makeLine(xTL, zTL, xBR, zTL)); // North edge
      lines.push(makeLine(xBR, zTL, xBR, zBR)); // East edge
      lines.push(makeLine(xBR, zBR, xTL, zBR)); // South edge
      lines.push(makeLine(xTL, zBR, xTL, zTL)); // West edge
      this._dirFrameLines = lines;
      lines.forEach(l => this.scene.add(l));
      // Place simple labels near edges (N/E/S/W) using small sprites via CSS2D-like overlay (simple divs with positions)
      const addLabel = (txt, x, z) => {
        const d = document.createElement('div');
        d.textContent = txt;
        Object.assign(d.style, { position: 'absolute', color: '#ffcc00', font: '12px monospace',
          transform: 'translate(-50%, -50%)', pointerEvents: 'none', textShadow: '0 0 2px #000' });
        d.dataset.dirLabel = '1';
        document.body.appendChild(d);
        return d;
      };
      const mid = (a,b)=> (a+b)/2;
      this._dirLabels = [
        addLabel('N', mid(xTL,xBR), zTL),
        addLabel('E', xBR, mid(zTL,zBR)),
        addLabel('S', mid(xTL,xBR), zBR),
        addLabel('W', xTL, mid(zTL,zBR)),
      ];
    },
    clearNeighborhoodFrame() {
      if (this._dirFrameLines) { this._dirFrameLines.forEach((l)=>{ try{ this.scene.remove(l); l.geometry?.dispose?.(); }catch(e){} }); this._dirFrameLines = null; }
      const labels = document.querySelectorAll('div[data-dir-label="1"]');
      labels.forEach((n)=>{ try{ n.remove(); }catch(e){} });
    },
    _updateDirectionLabels() {
      if (!this._dirLabels || !this._dirFrameCoords || !this.renderer || !this.camera) return;
      const { xTL, zTL, xBR, zBR, y } = this._dirFrameCoords;
      const rect = this.renderer.domElement.getBoundingClientRect();
      const mid = (a,b)=> (a+b)/2;
      const points = [
        { i: 0, x: mid(xTL,xBR), z: zTL }, // N
        { i: 1, x: xBR, z: mid(zTL,zBR) }, // E
        { i: 2, x: mid(xTL,xBR), z: zBR }, // S
        { i: 3, x: xTL, z: mid(zTL,zBR) }, // W
      ];
      for (const p of points) {
        const v = new THREE.Vector3(p.x, y, p.z).project(this.camera);
        const sx = (v.x * 0.5 + 0.5) * rect.width; const sy = (-v.y * 0.5 + 0.5) * rect.height;
        const el = this._dirLabels[p.i];
        if (el) { el.style.left = `${(rect.left + sx)}px`; el.style.top = `${(rect.top + sy)}px`; }
      }
    },
    onToggleClutter() {
      const svc = (this.chunkManager && this.chunkManager.clutter) ? this.chunkManager.clutter : this.clutter;
      if (svc) {
        const enable = !!this.features.clutter;
        svc.setEnabled(enable);
        if (enable) {
          // Ensure attached and prepared, then commit current area
          svc.addTo(this.scene);
          if (this.world) svc.prepareFromGrid(this.world);
          this.scheduleClutterCommit(0);
        } else {
          // Detach from scene to guarantee removal
          svc.removeFrom(this.scene);
        }
      }
  // Refresh direction frame to match new neighborhood bounds
  if (this.features?.directions) this.drawNeighborhoodFrame();
    },
    onToggleRadialFade() {
      // Force materials to recompile if toggled on after init
  if (this.topIM && this.topIM.material) this.topIM.material.needsUpdate = true;
  if (this.sideIM && this.sideIM.material) this.sideIM.material.needsUpdate = true;
      // Ensure clutter respects the new fade state immediately
      this.scheduleClutterCommit(0);
    },
  // Ensure slider changes also trigger any runtime effects where needed
  // WorldMap rendering reacts to values each frame via uniforms; here we only persist
    
    applyChunkColors(enabled) {
      if (this.neighborhood && this.neighborhood.applyChunkColors) {
        this.neighborhood.applyChunkColors(!!enabled);
        return;
      }
      if (!this.topIM || !this.sideIM || !this.indexToQR) return;
      const count = this.indexToQR.length;
  const tmpColor = this._tmpColorTop;
  const tmpSide = this._tmpColorSide;
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
  const sideXZ = xzScale * (this.sideInset != null ? this.sideInset : 0.996);
      const baseCol = wx * this.chunkCols;
      const baseRow = wy * this.chunkRows;
      const startIdx = slotIndex * this.countPerChunk;
      let local = 0;
      const useChunkColors = !!this.features.chunkColors;
      const cTop = this.pastelColorForChunk(wx, wy);
      const cSide = cTop.clone().multiplyScalar(0.8);
      const dummy = this._transformDummy || (this._transformDummy = markRaw(new THREE.Object3D()));
      for (let row = 0; row < this.chunkRows; row += 1) {
        for (let col = 0; col < this.chunkCols; col += 1) {
          const gCol = baseCol + col;
          const gRow = baseRow + row;
          const { q, r } = this.offsetToAxial(gCol, gRow);
          const x = hexWidth * q;
          const z = hexHeight * (r + q / 2);
          const cell = this.world ? this.world.getCell(q, r) : null;
          const isWater = !!(cell && (cell.biome === 'deepWater' || cell.biome === 'shallowWater'));
          // Build matrix once and reuse for top/side with differing Y scale
          dummy.position.set(x, 0, z);
          dummy.rotation.set(0, 0, 0);
          dummy.scale.set(xzScale, sx * (cell ? cell.yScale : 1.0), xzScale);
          dummy.updateMatrix();
          const topMatrix = dummy.matrix.clone();
          // Side scale adjustment
          const sideY = isWater ? Math.max(0.001, 0.02 * (this.modelScaleFactor || 1)) : (sx * (cell ? cell.yScale : 1.0));
          dummy.scale.set(sideXZ, sideY, sideXZ);
          dummy.updateMatrix();
          const sideMatrix = dummy.matrix.clone();
          const instIdx = startIdx + local;
          this.topIM.setMatrixAt(instIdx, topMatrix);
          this.sideIM.setMatrixAt(instIdx, sideMatrix);
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
    // Position neighborhood; delegate to manager
    setCenterChunk(wx, wy, options = {}) {
      this.centerChunk.x = wx; this.centerChunk.y = wy;
      if (this.chunkManager) this.chunkManager.setCenterChunk(wx, wy, { trailMs: 3000, forceRefill: options && options.forceRefill === true });
  // No stencil rebuild needed; water shader uses textures for masking
    // Keep water textures centered: rebuild if we drift near the texture edge
      if (this.waterMaterial && this.waterMesh && this.waterMaskTex) {
        const u = this.waterMaterial.uniforms;
        const q0 = u.uGridQ0 ? (u.uGridQ0.value|0) : 0;
        const r0 = u.uGridR0 ? (u.uGridR0.value|0) : 0;
        const N = u.uGridN ? (u.uGridN.value|0) : 0;
        const S = u.uGridOffset ? (u.uGridOffset.value|0) : 0;
        if (N > 0) {
      const rad = (this._neighborRadius != null) ? this._neighborRadius : 1;
      const baseCol = (wx - rad) * this.chunkCols;
      const baseRow = (wy - rad) * this.chunkRows;
      const newQ0 = baseCol;
      const newR0 = baseRow - Math.floor(baseCol / 2);
          const dq = Math.abs(newQ0 - q0);
          const dr = Math.abs(newR0 - r0);
          const guard = Math.max(8, Math.floor(S * 0.35));
          if (dq > (S - guard) || dr > (S - guard)) {
            this.buildWater();
          }
        }
      }
    },
    // Build instanced meshes for rectangular chunk neighborhood (even-q offset); then set center
    createChunkGrid() {
      if (!this.topGeom || !this.sideGeom) return;
  // Determine desired radius (absolute)
  const desiredRadius = Math.max(1, Number(this.generation?.radius ?? 5));
  // Progressive: on first build, always start with radius 1 to show content fast
  const progressiveStart = (desiredRadius > 1) && !this._progressiveModeActive;
  const radius = progressiveStart ? 1 : desiredRadius;
  this._neighborRadius = radius; // cache for bounds
      // Build via ChunkManager
      if (this.chunkManager && this.chunkManager.dispose) { try { this.chunkManager.dispose(); } catch (e) {} }
      this.chunkManager = new ChunkManager({
        scene: this.scene,
        world: this.world,
  clutter: this.clutter,
        layoutRadius: this.layoutRadius,
        spacingFactor: this.spacingFactor,
        modelScaleFactor: this.modelScaleFactor,
        contactScale: this.contactScale,
        sideInset: this.sideInset,
        chunkCols: this.chunkCols,
        chunkRows: this.chunkRows,
        neighborRadius: radius,
        features: this.features,
        centerChunk: this.centerChunk,
        hexMaxY: this.hexMaxY,
        modelScaleY: (q, r) => {
          const c = this.world.getCell(q, r);
          return this.modelScaleFactor * (c ? c.yScale : 1) * (this.heightMagnitude != null ? this.heightMagnitude : 1.0);
        },
        heightMagnitude: (this.heightMagnitude != null ? this.heightMagnitude : 1.0),
        pastelColorForChunk: (wx, wy) => this.pastelColorForChunk(wx, wy),
  streamBudgetMs: 6,
  streamMaxChunksPerTick: 0,
  rowsPerSlice: 6,
        onBuilt: (built) => {
          this.topIM = built.topIM;
          this.sideIM = built.sideIM;
          this.trailTopIM = built.trailTopIM;
          this.trailSideIM = built.trailSideIM;
          this.indexToQR = built.indexToQR;
          this.neighborOffsets = built.neighborOffsets;
          this.countPerChunk = built.countPerChunk;
          this._fadeUniforms = built.fadeUniforms;
          this._fadeUniformsDepth = built.fadeUniformsDepth;
          this._fadeUniformsTrail = built.fadeUniformsTrail;
          this._fadeUniformsDepthTrail = built.fadeUniformsDepthTrail;
        },
        onPickMeshes: (meshes) => {
          this.pickMeshes = markRaw(meshes);
        },
        onSnapshotTrail: (ms) => {
          this.snapshotTrailAndArmClear(ms);
        },
        onExtendTrail: (ms) => {
          this.extendTrail(ms);
        },
        onHideTrail: () => {
          if (this.trailTopIM) this.trailTopIM.visible = false;
          if (this.trailSideIM) this.trailSideIM.visible = false;
          if (this.trailTimer) { clearTimeout(this.trailTimer); this.trailTimer = null; }
          if (this.chunkManager) this.chunkManager.trailActive = false;
          // Trail is gone; rebuild clutter for the current neighborhood only
          // so any clutter kept under the trail union gets removed immediately.
          if (this.chunkManager && this.chunkManager.commitClutterForNeighborhood) {
            this.chunkManager.commitClutterForNeighborhood();
          }
        },
      });
      // Startup: chunk build start
      try {
        const now4 = performance.now?.() ?? Date.now();
        const t0 = (typeof window !== 'undefined' && window.__DAEMIOS_STARTUP?.t0) ? window.__DAEMIOS_STARTUP.t0 : now4;
        profiler.push('startup.chunk.build.start', now4 - t0);
      } catch (e) {}
      this.chunkManager.build(this.topGeom, this.sideGeom);
      // Create a single hover overlay mesh to avoid relying on instance colors
      if (this.topIM && this.topGeom) {
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
        this.hoverMesh = markRaw(new THREE.Mesh(this.topGeom, hoverMat));
        this.hoverMesh.visible = false;
        this.hoverMesh.matrixAutoUpdate = false;
        this.scene.add(this.hoverMesh);
      }
  // Picking targets
  this.pickMeshes = markRaw([this.topIM, this.sideIM]);
  // Defer water for chunks for now (mask mapping needs redesign)
  // Initialize center and fill chunks
  this.setCenterChunk(this.centerChunk.x, this.centerChunk.y);
  // Ensure colors are applied based on current toggle at startup
  this.applyChunkColors(!!this.features.chunkColors);

  // Clutter now handled by ChunkManager

  // Removed tan underlay plane (fadeUnderlay) to eliminate background plane

      if (this.radialFade) {
        // Define hex dimensions for this scope
        const layoutRadius = this.layoutRadius;
        const hexWidth = layoutRadius * 1.5 * this.spacingFactor;
        const hexHeight = Math.sqrt(3) * layoutRadius * this.spacingFactor;
        const totalCols = this.chunkCols * 3;
        const totalRows = this.chunkRows * 3;
        const halfW = 0.5 * hexWidth * Math.max(1, (totalCols - 1));
        const halfH = 0.5 * hexHeight * Math.max(1, (totalRows - 1));
        // Start fade well inside edges (~60% of min half-extent) so it's clearly visible
        const inner = 0.60 * Math.min(halfW, halfH);
        const minRadius = Math.max(2.0 * this.layoutRadius, hexHeight * 1.5);
        // Only set a default radius if one hasn't been provided via settings; otherwise, clamp to a safe minimum
        if (this.radialFade.radius == null || this.radialFade.radius <= 0) {
          this.radialFade.radius = Math.max(minRadius, inner);
        } else {
          this.radialFade.radius = Math.max(minRadius, this.radialFade.radius);
        }
        // Keep width reasonable in world units
        const minWidth = Math.max(hexHeight * 1.5, this.layoutRadius * 1.0);
        this.radialFade.width = Math.max(minWidth, this.radialFade.width || 0.0);
        // Initialize fade center to current camera target
        if (!this._fadeUniforms) this._fadeUniforms = {};
      }

      // Initial spawn: center of the center chunk (1,1) — only once on first load
  if (!this.playerSpawnSeeded) {
        const spawnWx = 1; const spawnWy = 1;
        if (spawnWx !== this.centerChunk.x || spawnWy !== this.centerChunk.y) {
          this.setCenterChunk(spawnWx, spawnWy);
        }
        const midCol = spawnWx * this.chunkCols + Math.floor(this.chunkCols / 2);
        const midRow = spawnWy * this.chunkRows + Math.floor(this.chunkRows / 2);
        const { q: startQ, r: startR } = this.offsetToAxial(midCol, midRow);
        // Compute world position directly from q,r (works before streaming fills indexToQR)
        this.ensurePlayerMarker();
        const pos2D = this.getTileWorldPos(startQ, startR);
        const cell = this.world ? this.world.getCell(startQ, startR) : null;
        const scaleY = (this.modelScaleFactor * (cell ? cell.yScale : 1) * (this.heightMagnitude != null ? this.heightMagnitude : 1.0));
        const yTop = this.hexMaxY * scaleY;
        const pos = new THREE.Vector3(pos2D.x, yTop + 0.01, pos2D.z);
        if (this.playerMarker) this.playerMarker.setWorldPosition(pos);
        // Also place the GLB location marker for clarity at the same world position
        this.placeLocationMarkerAtWorld(pos);
  this.focusCameraOnQR(startQ, startR, { smooth: true, duration: 900 });
  this.setCurrentTile(startQ, startR);
  // Notify backend/state just like a user click would
  try { api.post('world/move', { q: startQ, r: startR }); } catch (e) {}
        this.playerSpawnSeeded = true;
      }
      // If progressive expansion is desired, schedule rebuild to the full radius
      if (progressiveStart) {
        this._progressivePlanned = desiredRadius;
        this._scheduleProgressiveExpand();
      }
    },
    ensurePlayerMarker() {
      if (!this.playerMarker) {
        this.playerMarker = markRaw(new PlayerMarker());
        if (this.scene) this.playerMarker.addTo(this.scene);
      }
    },
    placeLocationMarkerAtWorld(pos) {
      this.ensureLocationMarkerLoaded((err) => {
        if (err || !this.locationMarker) return;
        const markerQuat = new THREE.Quaternion();
        const markerScale = this.locationMarker.scale.clone();
        this.locationMarker.matrix.compose(pos.clone(), markerQuat, markerScale);
        this.locationMarker.visible = true;
      });
    },
    onSetNeighborhoodRadius(radius) {
      const r = Math.max(1, Number(radius) || 1);
      if (!this.generation) this.generation = {};
  // Note: update:generation may have already set generation.radius before this handler runs.
  // Compare against the ACTIVE neighborhood radius instead, so we still rebuild when needed.
  const activeRadius = (this._neighborRadius != null) ? this._neighborRadius : (this.generation.radius ?? 1);
  // Update target radius for persistence/UI
      this.generation.radius = r;
      // If radial fade is enabled, expand its radius to roughly match the new neighborhood footprint
      if (this.radialFade && this.radialFade.enabled) {
        const hexW = this.layoutRadius * 1.5 * this.spacingFactor;
        const hexH = Math.sqrt(3) * this.layoutRadius * this.spacingFactor;
        const totalCols = (2 * r + 1) * this.chunkCols;
        const totalRows = (2 * r + 1) * this.chunkRows;
        const halfW = 0.5 * hexW * Math.max(1, (totalCols - 1));
        const halfH = 0.5 * hexH * Math.max(1, (totalRows - 1));
        const inner = 0.85 * Math.min(halfW, halfH); // leave a margin inside bounds
        const minWidth = Math.max(hexH * 1.5, this.layoutRadius * 1.0);
        this.radialFade.radius = Math.max(inner, this.radialFade.radius || 0);
        this.radialFade.width = Math.max(minWidth, this.radialFade.width || 0);
      }
      // Debounce heavy rebuilds
      clearTimeout(this._radiusTimer);
      this._radiusTimer = setTimeout(() => {
        // Only rebuild if the effective radius actually changes
        if (activeRadius !== r) {
          // Prefer an in-place rebuild of the current ChunkManager for faster updates
          if (this.chunkManager && this.topGeom && this.sideGeom) {
            this.chunkManager.neighborRadius = r;
            this._neighborRadius = r;
            this.chunkManager.build(this.topGeom, this.sideGeom);
            if (this.centerChunk) this.setCenterChunk(this.centerChunk.x, this.centerChunk.y);
          } else {
            // Fallback: full grid rebuild; skip progressive start for user-initiated size changes
            const prevProg = this._progressiveModeActive;
            this._progressiveModeActive = true;
            this.rebuildChunkGrid();
            this._progressiveModeActive = prevProg;
          }
        }
        // Rebuild water to align textures/plane to new footprint
        this.buildWater();
        // Persist
        if (this.settings?.mergeAtPath) this.settings.mergeAtPath({ path: 'worldMap', value: { generation: this.generation } });
      }, 120);
    },
    _scheduleProgressiveExpand() {
      // Wait until the initial small queue finishes streaming, then expand
      if (this._progressiveCheckId) cancelAnimationFrame(this._progressiveCheckId);
      const check = () => {
        const streaming = !!(this.chunkManager && this.chunkManager.streaming);
        if (!streaming && this._progressivePlanned > 1) {
          // Expand: rebuild grid at desired radius without re-triggering progressive path
          this._progressiveModeActive = true;
          this._neighborRadius = this._progressivePlanned;
          this.rebuildChunkGrid();
          // Rebuild water to match the expanded footprint
          this.buildWater();
          this._progressivePlanned = 0;
          // Allow future manual toggles to use progressive again if wanted
          this._progressiveModeActive = false;
          this._progressiveCheckId = null;
        } else {
          this._progressiveCheckId = requestAnimationFrame(check);
        }
      };
      this._progressiveCheckId = requestAnimationFrame(check);
    },
    computeNeighborOffsets(radius) {
      const out = [];
      for (let dy = -radius; dy <= radius; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          out.push({ dx, dy });
        }
      }
      // Sort by distance from center so nearby chunks fill first
      out.sort((a, b) => (a.dx * a.dx + a.dy * a.dy) - (b.dx * b.dx + b.dy * b.dy));
      return out;
    },
  // Removed legacy expand-neighborhood toggle handler
    rebuildChunkGrid() {
      // Remove and dispose old instancers via neighborhood service if present
      if (this.neighborhood && this.neighborhood.dispose) {
        this.neighborhood.dispose();
      } else {
        const disposeIM = (im) => {
          if (!im) return;
          try { this.scene.remove(im); } catch (e) {}
          try { if (im.material && im.material.dispose) im.material.dispose(); } catch (e) {}
          try { if (im.customDepthMaterial && im.customDepthMaterial.dispose) im.customDepthMaterial.dispose(); } catch (e) {}
          try { if (im.customDistanceMaterial && im.customDistanceMaterial.dispose) im.customDistanceMaterial.dispose(); } catch (e) {}
        };
        disposeIM(this.topIM); disposeIM(this.sideIM); disposeIM(this.trailTopIM); disposeIM(this.trailSideIM);
      }
      this.neighborhood = null;
      this.topIM = null; this.sideIM = null; this.trailTopIM = null; this.trailSideIM = null;
      this.pickMeshes = [];
      this.indexToQR = [];
      // Recreate with new neighborhood sizing
      this.createChunkGrid();
      if (this.centerChunk) this.setCenterChunk(this.centerChunk.x, this.centerChunk.y);
      // Recommit clutter for the new bounds
      this.commitClutterForNeighborhood();
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
      // Startup: world init begin
      try {
        const now0 = performance.now?.() ?? Date.now();
        const t0 = (typeof window !== 'undefined' && window.__DAEMIOS_STARTUP?.t0) ? window.__DAEMIOS_STARTUP.t0 : now0;
        profiler.push('startup.world.init.begin', now0 - t0);
      } catch (e) {}
      const width = this.$refs.sceneContainer.clientWidth;
      const height = this.$refs.sceneContainer.clientHeight;

  this.scene = markRaw(new THREE.Scene());
    // Add a simple gradient skybox
    // Create a canvas gradient texture
    const skyCanvas = document.createElement('canvas');
    skyCanvas.width = 512;
    skyCanvas.height = 512;
    const ctx = skyCanvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, skyCanvas.height);
    gradient.addColorStop(0, '#6a93ff'); // Top: soft blue
    gradient.addColorStop(0.7, '#b3e3ff'); // Middle: light blue
    gradient.addColorStop(1, '#f7f7ff'); // Bottom: near white
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, skyCanvas.width, skyCanvas.height);
    const skyTexture = new THREE.CanvasTexture(skyCanvas);
    this.scene.background = skyTexture;
  this.camera = markRaw(new THREE.PerspectiveCamera(60, width / height, 0.1, 1000));
      this.camera.position.set(0, 20, 20);
      this.camera.lookAt(0, 0, 0);

      const camVec = this.camera.position.clone().sub(this.orbit.target);
      this.orbit.radius = camVec.length();
      this.orbit.theta = Math.atan2(camVec.x, camVec.z);
      this.orbit.phi = Math.acos(camVec.y / this.orbit.radius);

  this.renderer = markRaw(new THREE.WebGLRenderer({ antialias: false, stencil: false }));
  // Slightly upscale to reduce aliasing while keeping perf in check
  const devicePR = Math.min(1.5, (window.devicePixelRatio || 1));
  this.renderer.setPixelRatio(devicePR);
      this.renderer.setSize(width, height);
      if (this.renderer.outputEncoding !== undefined) this.renderer.outputEncoding = THREE.sRGBEncoding;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.0;
      this.renderer.physicallyCorrectLights = false;
      this.$refs.sceneContainer.appendChild(this.renderer.domElement);
      // Startup: first content visible
      try {
        const now1 = performance.now?.() ?? Date.now();
        const t0 = (typeof window !== 'undefined' && window.__DAEMIOS_STARTUP?.t0) ? window.__DAEMIOS_STARTUP.t0 : now1;
        profiler.push('startup.first.content', now1 - t0);
        if (typeof window !== 'undefined') window.__DAEMIOS_STARTUP.firstContent = true;
      } catch (e) {}

      // FPS overlay
      this.fpsEl = document.createElement('div');
      Object.assign(this.fpsEl.style, {
        position: 'absolute', top: '4px', right: '6px', padding: '2px 6px',
        background: 'rgba(0,0,0,0.4)', color: '#fff', font: '11px monospace',
        borderRadius: '4px', pointerEvents: 'none', zIndex: 1,
      });
      this.fpsEl.textContent = 'FPS: --';
      this.$refs.sceneContainer.appendChild(this.fpsEl);

      // Set up GPU timer if available
      try {
        this._gpuTimer = createWebGLTimer(this.renderer);
        if (this._gpuTimer) profiler.setGPU(this._gpuTimer);
      } catch (e) { /* ignore */ }

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
      this.keyLight.castShadow = true;
      this.keyLight.shadow.mapSize.width = 2048;
      this.keyLight.shadow.mapSize.height = 2048;
      this.keyLight.shadow.bias = -0.0001;
      this.keyLight.shadow.normalBias = 0.2;
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
    seed: this.worldSeed,
    generationScale: this.generation.scale,
    generatorVersion: this.generation.version,
    }));
  // Apply any saved generator tuning immediately
  if (this.world && this.world.setGeneratorTuning && this.generation && this.generation.tuning) {
    this.world.setGeneratorTuning(this.generation.tuning);
  }
  this.clutter = markRaw(new ClutterManager({ streamBudgetMs: 6 }));
  // Tie clutter RNG to the same seed for deterministic placement
  if (this.clutter) this.clutter.worldSeed = this.worldSeed;

      this.loadModel();
      this.animate = this.animate.bind(this);
      this.animate();
      // Startup: world init end
      try {
        const now2 = performance.now?.() ?? Date.now();
        const t0 = (typeof window !== 'undefined' && window.__DAEMIOS_STARTUP?.t0) ? window.__DAEMIOS_STARTUP.t0 : now2;
        profiler.push('startup.world.init.end', now2 - t0);
      } catch (e) {}
    },
    loadModel() {
      const loader = new GLTFLoader();
  const __tLoadStart = performance.now?.() ?? Date.now();
  loader.load('/models/hex-can.glb', (gltf) => {
        this.hexModel = markRaw(gltf.scene);
        try {
          const now3 = performance.now?.() ?? Date.now();
          const t0 = (typeof window !== 'undefined' && window.__DAEMIOS_STARTUP?.t0) ? window.__DAEMIOS_STARTUP.t0 : now3;
          profiler.push('startup.asset.hex.load', now3 - t0);
          profiler.push('startup.asset.hex.load.self', now3 - __tLoadStart);
        } catch (e) {}
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
        // Remove any up-facing triangles (top caps) from side geometry to avoid coplanar overlap
        const stripUpFacingCaps = (geom, dotThresh = 0.8) => {
          if (!geom) return geom;
          const posAttr = geom.getAttribute('position');
          if (!posAttr) return geom;
          const up = new THREE.Vector3(0,1,0);
          const a = new THREE.Vector3();
          const b = new THREE.Vector3();
          const c = new THREE.Vector3();
          const e1 = new THREE.Vector3();
          const e2 = new THREE.Vector3();
          const n = new THREE.Vector3();
          if (geom.index) {
            const idx = geom.index.array;
            const newIdx = [];
            for (let i = 0; i < idx.length; i += 3) {
              const i0 = idx[i], i1 = idx[i+1], i2 = idx[i+2];
              a.fromBufferAttribute(posAttr, i0);
              b.fromBufferAttribute(posAttr, i1);
              c.fromBufferAttribute(posAttr, i2);
              e1.subVectors(b, a);
              e2.subVectors(c, a);
              n.crossVectors(e1, e2).normalize();
              const d = n.dot(up);
              if (d <= dotThresh) { newIdx.push(i0, i1, i2); }
            }
            const newGeom = geom.clone();
            newGeom.setIndex(newIdx);
            newGeom.computeVertexNormals();
            newGeom.computeBoundingBox();
            newGeom.computeBoundingSphere();
            return newGeom;
          }
          // Non-indexed: rebuild filtered attribute arrays
          const count = posAttr.count; // vertices
          const pos = posAttr.array;
          const hasNormal = !!geom.getAttribute('normal');
          const hasUV = !!geom.getAttribute('uv');
          const hasColor = !!geom.getAttribute('color');
          const outPos = [];
          const outUV = hasUV ? [] : null;
          const outColor = hasColor ? [] : null;
          for (let i = 0; i < count; i += 3) {
            a.fromArray(pos, (i+0)*3);
            b.fromArray(pos, (i+1)*3);
            c.fromArray(pos, (i+2)*3);
            e1.subVectors(b, a);
            e2.subVectors(c, a);
            n.crossVectors(e1, e2).normalize();
            const d = n.dot(up);
            if (d <= dotThresh) {
              outPos.push(a.x,a.y,a.z, b.x,b.y,b.z, c.x,c.y,c.z);
              if (outUV) {
                const uv = geom.getAttribute('uv');
                outUV.push(
                  uv.getX(i+0), uv.getY(i+0),
                  uv.getX(i+1), uv.getY(i+1),
                  uv.getX(i+2), uv.getY(i+2)
                );
              }
              if (outColor) {
                const col = geom.getAttribute('color');
                outColor.push(
                  col.getX(i+0), col.getY(i+0), col.getZ(i+0),
                  col.getX(i+1), col.getY(i+1), col.getZ(i+1),
                  col.getX(i+2), col.getY(i+2), col.getZ(i+2)
                );
              }
            }
          }
          const newGeom = new THREE.BufferGeometry();
          newGeom.setAttribute('position', new THREE.Float32BufferAttribute(outPos, 3));
          if (outUV) newGeom.setAttribute('uv', new THREE.Float32BufferAttribute(outUV, 2));
          if (outColor) newGeom.setAttribute('color', new THREE.Float32BufferAttribute(outColor, 3));
          newGeom.computeVertexNormals();
          newGeom.computeBoundingBox();
          newGeom.computeBoundingSphere();
          return newGeom;
        };
        if (this.sideGeom) this.sideGeom = stripUpFacingCaps(this.sideGeom, 0.8);
        // Remove inner ring of vertical walls (keep only outer shell)
        const stripInwardFacingWalls = (geom) => {
          if (!geom) return geom;
          const posAttr = geom.getAttribute('position');
          if (!posAttr) return geom;
          const a = new THREE.Vector3();
          const b = new THREE.Vector3();
          const c = new THREE.Vector3();
          const e1 = new THREE.Vector3();
          const e2 = new THREE.Vector3();
          const n = new THREE.Vector3();
          const centroid = new THREE.Vector3();
          const isVertical = (normal) => Math.abs(normal.y) < 0.2;
          const radius = (v) => Math.hypot(v.x, v.z);

          // First pass: find radius range for vertical walls
          let rMin = Infinity, rMax = -Infinity;
          const scanTri = (va, vb, vc) => {
            e1.subVectors(vb, va);
            e2.subVectors(vc, va);
            n.crossVectors(e1, e2).normalize();
            if (!isVertical(n)) return;
            centroid.copy(va).add(vb).add(vc).multiplyScalar(1/3);
            const rc = radius(centroid);
            if (rc < rMin) rMin = rc;
            if (rc > rMax) rMax = rc;
          };
          if (geom.index) {
            const idx = geom.index.array;
            for (let i = 0; i < idx.length; i += 3) {
              a.fromBufferAttribute(posAttr, idx[i]);
              b.fromBufferAttribute(posAttr, idx[i+1]);
              c.fromBufferAttribute(posAttr, idx[i+2]);
              scanTri(a,b,c);
            }
          } else {
            const count = posAttr.count; const pos = posAttr.array;
            for (let i = 0; i < count; i += 3) {
              a.fromArray(pos, (i+0)*3);
              b.fromArray(pos, (i+1)*3);
              c.fromArray(pos, (i+2)*3);
              scanTri(a,b,c);
            }
          }
          if (!isFinite(rMin) || !isFinite(rMax) || rMax <= rMin) return geom; // nothing to do
          const rThresh = (rMin + rMax) * 0.5; // split between inner and outer ring

          const keepTri = (va, vb, vc) => {
            e1.subVectors(vb, va);
            e2.subVectors(vc, va);
            n.crossVectors(e1, e2).normalize();
            if (!isVertical(n)) return true; // keep non-vertical (bevel) triangles
            centroid.copy(va).add(vb).add(vc).multiplyScalar(1/3);
            return radius(centroid) >= rThresh - 1e-6;
          };

          if (geom.index) {
            const idx = geom.index.array;
            const newIdx = [];
            for (let i = 0; i < idx.length; i += 3) {
              const i0 = idx[i], i1 = idx[i+1], i2 = idx[i+2];
              a.fromBufferAttribute(posAttr, i0);
              b.fromBufferAttribute(posAttr, i1);
              c.fromBufferAttribute(posAttr, i2);
              if (keepTri(a,b,c)) newIdx.push(i0, i1, i2);
            }
            const newGeom = geom.clone();
            newGeom.setIndex(newIdx);
            newGeom.computeVertexNormals();
            newGeom.computeBoundingBox();
            newGeom.computeBoundingSphere();
            return newGeom;
          }
          // Non-indexed path rebuild
          const count = posAttr.count; const pos = posAttr.array;
          const hasUV = !!geom.getAttribute('uv');
          const hasColor = !!geom.getAttribute('color');
          const outPos = [];
          const outUV = hasUV ? [] : null;
          const outColor = hasColor ? [] : null;
          for (let i = 0; i < count; i += 3) {
            a.fromArray(pos, (i+0)*3);
            b.fromArray(pos, (i+1)*3);
            c.fromArray(pos, (i+2)*3);
            if (keepTri(a,b,c)) {
              outPos.push(a.x,a.y,a.z, b.x,b.y,b.z, c.x,c.y,c.z);
              if (outUV) {
                const uv = geom.getAttribute('uv');
                outUV.push(
                  uv.getX(i+0), uv.getY(i+0),
                  uv.getX(i+1), uv.getY(i+1),
                  uv.getX(i+2), uv.getY(i+2)
                );
              }
              if (outColor) {
                const col = geom.getAttribute('color');
                outColor.push(
                  col.getX(i+0), col.getY(i+0), col.getZ(i+0),
                  col.getX(i+1), col.getY(i+1), col.getZ(i+1),
                  col.getX(i+2), col.getY(i+2), col.getZ(i+2)
                );
              }
            }
          }
          const newGeom = new THREE.BufferGeometry();
          newGeom.setAttribute('position', new THREE.Float32BufferAttribute(outPos, 3));
          if (outUV) newGeom.setAttribute('uv', new THREE.Float32BufferAttribute(outUV, 2));
          if (outColor) newGeom.setAttribute('color', new THREE.Float32BufferAttribute(outColor, 3));
          newGeom.computeVertexNormals();
          newGeom.computeBoundingBox();
          newGeom.computeBoundingSphere();
          return newGeom;
        };
        if (this.sideGeom) this.sideGeom = stripInwardFacingWalls(this.sideGeom);
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
  // Build global water plane now that geometries and world are ready
  // This reintroduces the water surface for chunked rendering
  if (this.features && this.features.water != null) {
    this.buildWater();
  }
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

      const count = (2 * size + 1) * (2 * size +  1);
  const topMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const sideMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  this.topIM = markRaw(new THREE.InstancedMesh(this.topGeom, topMat, count));
  this.sideIM = markRaw(new THREE.InstancedMesh(this.sideGeom, sideMat, count));
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
    buildWater() {
      const __t0 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  // Remove old
  if (this.waterMesh) { if (this.waterMesh.parent) this.waterMesh.parent.remove(this.waterMesh); this.waterMesh = null; }
  // No stencil instanced mesh to remove anymore
    // 1) Create land mask/seabed textures sized to fully cover the water plane (plus padding)
      const radius = this._neighborRadius != null ? this._neighborRadius : 1;
      // Estimate plane dimensions for current neighborhood (reuse below for geometry)
      const hexW_est = this.layoutRadius * 1.5 * this.spacingFactor;
      const hexH_est = Math.sqrt(3) * this.layoutRadius * this.spacingFactor;
  const totalCols_est = (2 * radius + 1) * this.chunkCols;
  const totalRows_est = (2 * radius + 1) * this.chunkRows;
  // No extra plane margin; keep exactly to the neighborhood bounds
  const marginCols_est = 0;
  const marginRows_est = 0;
  const planeW_est = (totalCols_est + marginCols_est) * hexW_est;
  const planeH_est = (totalRows_est + marginRows_est) * hexH_est;
  // Compute S so that the mask square in axial covers the entire plane footprint with generous padding
      const halfW = planeW_est * 0.5;
      const halfH = planeH_est * 0.5;
      const corners = [
        { x: -halfW, z: -halfH },
        { x: -halfW, z:  halfH },
        { x:  halfW, z: -halfH },
        { x:  halfW, z:  halfH },
      ];
      let maxQAbs = 0, maxRAbs = 0;
      for (const c of corners) {
        const q = c.x / Math.max(1e-6, hexW_est);
        const r = c.z / Math.max(1e-6, hexH_est) - q * 0.5;
        maxQAbs = Math.max(maxQAbs, Math.abs(q));
        maxRAbs = Math.max(maxRAbs, Math.abs(r));
      }
  // Ensure at least a full one-chunk margin in the texture window
  const chunkQSpan = this.chunkCols;
  const chunkRSpan = this.chunkRows; // approx; axial r maps from rows
  const chunkMargin = Math.max(chunkQSpan, chunkRSpan);
  const pad = Math.max(chunkMargin + 8, Math.ceil(Math.max(maxQAbs, maxRAbs) * 0.35));
  const S = Math.min(2048, Math.ceil(Math.max(maxQAbs, maxRAbs)) + pad);
  const N = (2 * S + 1);
  // Choose a stable integer axial origin aligned to the top-left of the visible neighborhood
  const nbBaseCol = (this.centerChunk.x - radius) * this.chunkCols;
  const nbBaseRow = (this.centerChunk.y - radius) * this.chunkRows;
  const qOrigin = nbBaseCol;
  const rOrigin = nbBaseRow - Math.floor(qOrigin / 2);
  const data = new Uint8Array(N * N * 4);
  const coverage = new Uint8Array(N * N * 4);
      const seabed = new Uint8Array(N * N * 4);
      let i = 0;
      for (let r = -S; r <= S; r += 1) {
        for (let q = -S; q <= S; q += 1) {
          const qW = q + qOrigin;
          const rW = r + rOrigin;
          const cell = this.world.getCell(qW, rW);
          const isWater = cell && (cell.biome === 'deepWater' || cell.biome === 'shallowWater');
          const v = isWater ? 0 : 255;
          data[i] = v; // R
          data[i + 1] = 0;
          data[i + 2] = 0;
          data[i + 3] = 255;
          // Seabed: store normalized yScale (top height factor) in R channel
          const ys = cell ? Math.max(0, Math.min(1, cell.yScale)) : 0;
          seabed[i] = Math.floor(ys * 255);
          seabed[i + 1] = 0;
          seabed[i + 2] = 0;
          seabed[i + 3] = 255;
          // Coverage: 1 inside the currently rendered hex footprint (union with trail when active), else 0
          let inRect = false;
          if (this.centerChunk) {
            const rads = this._neighborRadius != null ? this._neighborRadius : 1;
            const baseCol = (this.centerChunk.x - rads) * this.chunkCols;
            const baseRow = (this.centerChunk.y - rads) * this.chunkRows;
            const endCol = (this.centerChunk.x + rads) * this.chunkCols + (this.chunkCols - 1);
            const endRow = (this.centerChunk.y + rads) * this.chunkRows + (this.chunkRows - 1);
            const off = this.axialToOffset(qW, rW);
            if (off.col >= baseCol && off.col <= endCol && off.row >= baseRow && off.row <= endRow) inRect = true;
            // Union with previous neighborhood while trail is visible for seamless transitions
            if (rads === 1 && this._prevNeighborhoodRect && this.trailTopIM && this.trailTopIM.visible) {
              const c = off.col, rOff = off.row;
              if (c >= this._prevNeighborhoodRect.colMin && c <= this._prevNeighborhoodRect.colMax && rOff >= this._prevNeighborhoodRect.rowMin && rOff <= this._prevNeighborhoodRect.rowMax) inRect = true;
            }
          }
          const cv = inRect ? 255 : 0;
          coverage[i] = cv; coverage[i+1] = 0; coverage[i+2] = 0; coverage[i+3] = 255;
          i += 4;
        }
      }
  const tex = markRaw(new THREE.DataTexture(data, N, N, THREE.RGBAFormat));
      tex.needsUpdate = true;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
  this.waterMaskTex = tex;

  // Signed-distance field: land positive, water negative
  const cellSize = Math.min(hexW_est, hexH_est);
  const diag = cellSize * Math.SQRT2;
  const len = N * N;
  const toWater = new Float32Array(len);
  const toLand = new Float32Array(len);
  const INF = 1e9;
  for (let p = 0, j = 0; p < len; p++, j += 4) {
    const isLand = data[j] > 0;
    toLand[p] = isLand ? 0 : INF;
    toWater[p] = isLand ? INF : 0;
  }
  const dt = (dist) => {
    // forward pass
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const idx = y * N + x;
        let best = dist[idx];
        if (x > 0) best = Math.min(best, dist[idx - 1] + cellSize);
        if (y > 0) best = Math.min(best, dist[idx - N] + cellSize);
        if (x > 0 && y > 0) best = Math.min(best, dist[idx - N - 1] + diag);
        if (x < N - 1 && y > 0) best = Math.min(best, dist[idx - N + 1] + diag);
        dist[idx] = best;
      }
    }
    // backward pass
    for (let y = N - 1; y >= 0; y--) {
      for (let x = N - 1; x >= 0; x--) {
        const idx = y * N + x;
        let best = dist[idx];
        if (x < N - 1) best = Math.min(best, dist[idx + 1] + cellSize);
        if (y < N - 1) best = Math.min(best, dist[idx + N] + cellSize);
        if (x < N - 1 && y < N - 1) best = Math.min(best, dist[idx + N + 1] + diag);
        if (x > 0 && y < N - 1) best = Math.min(best, dist[idx + N - 1] + diag);
        dist[idx] = best;
      }
    }
  };
  dt(toLand);
  dt(toWater);
  const sdfArr = new Float32Array(len);
  for (let p = 0, j = 0; p < len; p++, j += 4) {
    const isLand = data[j] > 0;
    sdfArr[p] = isLand ? toWater[p] : -toLand[p];
  }
  const distTex = markRaw(new THREE.DataTexture(sdfArr, N, N, THREE.RedFormat, THREE.FloatType));
  distTex.needsUpdate = true;
  distTex.magFilter = THREE.LinearFilter;
  distTex.minFilter = THREE.LinearFilter;
  distTex.wrapS = THREE.ClampToEdgeWrapping;
  distTex.wrapT = THREE.ClampToEdgeWrapping;
  this.waterDistanceTex = distTex;

  const coverageTex = markRaw(new THREE.DataTexture(coverage, N, N, THREE.RGBAFormat));
  coverageTex.needsUpdate = true;
  coverageTex.magFilter = THREE.NearestFilter;
  coverageTex.minFilter = THREE.NearestFilter;
  coverageTex.wrapS = THREE.ClampToEdgeWrapping;
  coverageTex.wrapT = THREE.ClampToEdgeWrapping;
  this.waterCoverageTex = coverageTex;

      const seabedTex = markRaw(new THREE.DataTexture(seabed, N, N, THREE.RGBAFormat));
    seabedTex.needsUpdate = true;
    seabedTex.magFilter = THREE.NearestFilter;
    seabedTex.minFilter = THREE.NearestFilter;
    seabedTex.wrapS = THREE.ClampToEdgeWrapping;
    seabedTex.wrapT = THREE.ClampToEdgeWrapping;
    this.waterSeabedTex = seabedTex;

  // 2) Keep seabed hex tops: no culling. Sides for water tiles are already kept short during instancing.

  // Compute minima (for sand underlay placement only)
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

  // 3) Single large plane spanning the current visible neighborhood (with generous padding)
  const hexW = this.layoutRadius * 1.5 * this.spacingFactor;
  const hexH = Math.sqrt(3) * this.layoutRadius * this.spacingFactor;
  const totalCols = (2 * radius + 1) * this.chunkCols;
  const totalRows = (2 * radius + 1) * this.chunkRows;
  const marginCols = 0;
  const marginRows = 0;
  const planeW = (totalCols + marginCols) * hexW;
  const planeH = (totalRows + marginRows) * hexH;
  const geom = new THREE.PlaneGeometry(planeW, planeH, 1, 1);
      geom.rotateX(-Math.PI / 2);

  // Removed sand underlay plane to eliminate tan plane in the scene

      // Water plane at global sea level (just above shallowWater threshold)
  const factory = createRealisticWaterMaterial;
      // Compute sea level world Y and hex world vertical scale factor
      const seaH = BIOME_THRESHOLDS.shallowWater;
      const base = (this.elevation && this.elevation.base != null) ? this.elevation.base : 0.08;
      const maxH = (this.elevation && this.elevation.max != null) ? this.elevation.max : 1.2;
      const seaLevelYScale = base + seaH * maxH;
  const hexMaxYScaled = this.hexMaxY * this.modelScaleFactor * (this.heightMagnitude != null ? this.heightMagnitude : 1.0);
      const seaLevelY = hexMaxYScaled * seaLevelYScale;

  // Use the same origin used to build the textures for exact alignment
  const centerQ0 = qOrigin;
  const centerR0 = rOrigin;
    const mat = markRaw(factory({
        opacity: 0.96,
        distanceTexture: this.waterDistanceTex,
        coverageTexture: this.waterCoverageTex,
        seabedTexture: this.waterSeabedTex,
        hexW,
        hexH,
        gridN: N,
        gridOffset: S,
        gridQ0: centerQ0,
        gridR0: centerR0,
        shoreWidth: 0.12,
        hexMaxYScaled,
        seaLevelY,
  depthMax: hexMaxYScaled * 0.3, // ~30% of max vertical extent for full opacity
        nearAlpha: 0.08,
        farAlpha: 0.9,
  }));
  // No stencil: shader textures handle water/shore coverage and visibility
  this.waterMaterial = markRaw(mat);
  const mesh = markRaw(new THREE.Mesh(geom, mat));
  // Position water at previously computed world sea level (plus tiny epsilon to avoid z-fight)
  const waterY = seaLevelY + 0.001;
      // Center the plane over the current neighborhood in world XZ using axial mapping
  const baseCol = (this.centerChunk.x - radius) * this.chunkCols;
  const baseRow = (this.centerChunk.y - radius) * this.chunkRows;
  const endCol = (this.centerChunk.x + radius) * this.chunkCols + (this.chunkCols - 1);
  const endRow = (this.centerChunk.y + radius) * this.chunkRows + (this.chunkRows - 1);
  const tlAx = this.offsetToAxial(baseCol, baseRow);
  const brAx = this.offsetToAxial(endCol, endRow);
  const xTL = hexW * tlAx.q;
  const zTL = hexH * (tlAx.r + tlAx.q * 0.5);
  const xBR = hexW * brAx.q;
  const zBR = hexH * (brAx.r + brAx.q * 0.5);
  const centerX = 0.5 * (xTL + xBR);
  const centerZ = 0.5 * (zTL + zBR);
      mesh.position.set(centerX, waterY, centerZ);
      mesh.renderOrder = 1;
      mesh.frustumCulled = false;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
  this.waterMesh = mesh;

  // No stencil instanced mesh; water draws across the plane and masks via textures

  const visible = !!this.features.water;
  if (this.waterMesh) this.waterMesh.visible = visible;
    },
  // rebuildWaterStencil: removed (no stencil)
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
      // Start frame profiling
      if (this.profilerEnabled) profiler.beginFrame();
      // Startup: record first frame once
      if (typeof window !== 'undefined' && window.__DAEMIOS_STARTUP && !window.__DAEMIOS_STARTUP.firstFrame) {
        try {
          const nowF = performance.now?.() ?? Date.now();
          const t0 = window.__DAEMIOS_STARTUP.t0 ?? nowF;
          profiler.push('startup.first.frame', nowF - t0);
          window.__DAEMIOS_STARTUP.firstFrame = true;
        } catch (e) {}
      }
      // Camera tween update before render
      if (this.cameraTween && this.cameraTween.active) {
        if (this.profilerEnabled) profiler.start('frame.tween');
        const now = performance.now();
        const t = Math.min(1, (now - this.cameraTween.startTime) / this.cameraTween.duration);
        const tt = t * t * (3 - 2 * t);
        this.orbit.target.lerpVectors(this.cameraTween.start.target, this.cameraTween.end.target, tt);
        this.orbit.radius = this.cameraTween.start.radius + (this.cameraTween.end.radius - this.cameraTween.start.radius) * tt;
        const a = this.cameraTween.start.theta; const b = this.cameraTween.end.theta;
        let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI; if (d < -Math.PI) d += Math.PI * 2;
        this.orbit.theta = a + d * tt;
        this.orbit.phi = this.cameraTween.start.phi + (this.cameraTween.end.phi - this.cameraTween.start.phi) * tt;
        this.updateCameraFromOrbit();
        if (t >= 1) {
          this.cameraTween.active = false;
          if (this.tweenSaved.pixelRatio != null) { this.renderer.setPixelRatio(this.tweenSaved.pixelRatio); this.tweenSaved.pixelRatio = null; this.onResize(); }
        }
        if (this.profilerEnabled) profiler.end('frame.tween');
      }
      // Animate water
      if (this.waterMaterial) {
        if (this.profilerEnabled) profiler.start('frame.waterUniform');
        this.waterMaterial.uniforms.uTime.value = (performance.now() * 0.001);
        if (this.profilerEnabled) profiler.end('frame.waterUniform');
      }
      // Update radial fade uniforms to follow the camera target
      if (this.profilerEnabled) profiler.start('frame.fadeUniforms');
      if (this._fadeUniforms) {
        updateRadialFadeUniforms(this._fadeUniforms, {
          center: { x: this.orbit.target.x, y: this.orbit.target.z },
          radius: this.radialFade.radius,
          width: this.radialFade.width,
          enabled: !!this.radialFade.enabled,
          minHeightScale: this.radialFade.minHeightScale,
          hexCornerRadius: this.layoutRadius * this.contactScale,
        });
      }
      if (this._fadeUniformsDepth) {
        updateRadialFadeUniforms(this._fadeUniformsDepth, {
          center: { x: this.orbit.target.x, y: this.orbit.target.z },
          radius: this.radialFade.radius,
          width: this.radialFade.width,
          enabled: !!this.radialFade.enabled,
          minHeightScale: this.radialFade.minHeightScale,
          hexCornerRadius: this.layoutRadius * this.contactScale,
        });
      }
      if (this._fadeUniformsTrail) {
        updateRadialFadeUniforms(this._fadeUniformsTrail, {
          center: { x: this.orbit.target.x, y: this.orbit.target.z },
          radius: this.radialFade.radius,
          width: this.radialFade.width,
          enabled: !!this.radialFade.enabled,
          minHeightScale: this.radialFade.minHeightScale,
          hexCornerRadius: this.layoutRadius * this.contactScale,
        });
      }
      if (this._fadeUniformsDepthTrail) {
        updateRadialFadeUniforms(this._fadeUniformsDepthTrail, {
          center: { x: this.orbit.target.x, y: this.orbit.target.z },
          radius: this.radialFade.radius,
          width: this.radialFade.width,
          enabled: !!this.radialFade.enabled,
          minHeightScale: this.radialFade.minHeightScale,
          hexCornerRadius: this.layoutRadius * this.contactScale,
        });
      }
      // Unify fade behavior while streaming
      const streaming = !!(this.chunkManager && this.chunkManager.streaming);
      const fadeEnabled = !!this.radialFade.enabled && !streaming;
      if (this._fadeUniforms) {
        updateRadialFadeUniforms(this._fadeUniforms, {
          center: { x: this.orbit.target.x, y: this.orbit.target.z },
          radius: this.radialFade.radius,
          width: this.radialFade.width,
          enabled: fadeEnabled,
          minHeightScale: this.radialFade.minHeightScale,
          hexCornerRadius: this.layoutRadius * this.contactScale,
        });
      }
      if (this._fadeUniformsDepth) {
        updateRadialFadeUniforms(this._fadeUniformsDepth, {
          center: { x: this.orbit.target.x, y: this.orbit.target.z },
          radius: this.radialFade.radius,
          width: this.radialFade.width,
          enabled: fadeEnabled,
          minHeightScale: this.radialFade.minHeightScale,
          hexCornerRadius: this.layoutRadius * this.contactScale,
        });
      }
      const cfade = (this.chunkManager && this.chunkManager.clutter) ? this.chunkManager.clutter : this.clutter;
      if (cfade && cfade.setRadialFadeState) {
        cfade.setRadialFadeState({ enabled: fadeEnabled, center: { x: this.orbit.target.x, y: this.orbit.target.z }, radius: this.radialFade.radius, corner: this.layoutRadius * this.contactScale, cullWholeHex: true });
      }
      if (this.profilerEnabled) profiler.end('frame.fadeUniforms');

  // Update billboards (yaw-only) before render
  if (this.playerMarker) this.playerMarker.faceCamera(this.camera);
  if (this.locationMarker && this.locationMarker.visible) {
    const pos = new THREE.Vector3(); const quat = new THREE.Quaternion(); const scl = new THREE.Vector3();
    this.locationMarker.matrix.decompose(pos, quat, scl);
    const dx = this.camera.position.x - pos.x; const dz = this.camera.position.z - pos.z;
    const yaw = Math.atan2(dx, dz) + Math.PI / 2;
    const yQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), yaw);
    this.locationMarker.matrix.compose(pos, yQuat, scl);
  }
  // Render with GPU timing if supported
  if (this.profilerEnabled && this._gpuTimer && this._gpuTimer.begin) this._gpuTimer.begin();
  if (this.profilerEnabled) profiler.start('frame.render');
  this.composer.render();
  if (this.profilerEnabled) profiler.end('frame.render');
  if (this.profilerEnabled && this._gpuTimer && this._gpuTimer.end) this._gpuTimer.end();

  // Update direction labels if active
  if (this.features?.directions) this._updateDirectionLabels();

  // Tilt-shift follow
  if (this.tiltShiftEnabled) this.updateTiltFocus();

  // FPS
  const now = performance.now();
  if (!this.fpsTime) { this.fpsTime = now; this.fpsFrames = 0; }
  this.fpsFrames += 1; const elapsed = now - this.fpsTime;
  if (elapsed >= 500) { this.fps = Math.round((this.fpsFrames * 1000) / elapsed); if (this.fpsEl) this.fpsEl.textContent = `FPS: ${this.fps}`; this.fpsTime = now; this.fpsFrames = 0; }

  // End frame profiling and update overlay ~2x/sec
  if (this.profilerEnabled) {
    profiler.endFrame();
    if (!this._profLastUpdate || (now - this._profLastUpdate) > 500) {
      this._profLastUpdate = now;
      // Gather live stats for WorldBenchmarkPanel
      const stats = {};
      const fmt = (v) => (v != null && isFinite(v)) ? (v < 0.095 ? (v * 1000).toFixed(2) + 'µs' : v.toFixed(2) + 'ms') : '--';
      stats.cpu = profiler.stats('frame.cpu');
      stats.gpu = profiler.stats('frame.gpu');
      stats.render = profiler.stats('frame.render');
      stats.fadeU = profiler.stats('frame.fadeUniforms');
      stats.tween = profiler.stats('frame.tween');
      stats.waterU = profiler.stats('frame.waterUniform');
      stats.stream = profiler.stats('stream.tick');
      stats.slice = profiler.stats('stream.fillSlice');
      stats.clutter = profiler.stats('clutter.tick');
      stats.water = profiler.stats('build.water');
      stats.chunk = profiler.stats('chunk.generate');
      stats.chunkCell = profiler.stats('chunk.gen.cell');
      stats.chunkMatrix = profiler.stats('chunk.gen.matrix');
      stats.chunkColor = profiler.stats('chunk.gen.color');
      stats.queueTotal = profiler.stats('stream.queue.total');
      stats.queueRate = profiler.stats('stream.queue.rate');
      stats.queueDone = profiler.stats('stream.queue.done');
      stats.queueTasks = profiler.stats('stream.queue.totalTasks');
      stats.queueEta = profiler.stats('stream.queue.eta');
      stats.dc = this.renderer?.info?.render?.calls ?? 0;
      stats.tris = this.renderer?.info?.render?.triangles ?? 0;
      // Startup timings
      stats.startup = {
        mount: profiler.stats('startup.app.mounted'),
        router: profiler.stats('startup.router.ready'),
        init0: profiler.stats('startup.world.init.begin'),
        init1: profiler.stats('startup.world.init.end'),
        hex: profiler.stats('startup.asset.hex.load'),
        chunk: profiler.stats('startup.chunk.build.start'),
        frame: profiler.stats('startup.first.frame'),
        content: profiler.stats('startup.first.content'),
      };
      // Streaming queue and instance progress
      if (this.chunkManager && this.chunkManager.neighborhood) {
        const nb = this.chunkManager.neighborhood;
        stats.queueLen = nb._buildQueue ? nb._buildQueue.length : 0;
        stats.queueCursor = nb._buildCursor || 0;
        stats.instCount = nb.topIM ? (nb.topIM.count | 0) : 0;
        stats.instTarget = nb._targetCount || 0;
      }
      // Pass live stats to WorldBenchmarkPanel via reactive property
      this.$refs.worldBenchmarkPanel?.setStats?.(stats);
    }
  }

  // Benchmark sampling remains below
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
          this.setCurrentTile(q, r);
          api.post('world/move', { q, r });
          // Also move camera focus and location marker locally with smoothing
          this.focusCameraOnQR(q, r, { smooth: true, duration: 700 });
          this.addLocationMarkerAtIndex(idx);
          // Update chunks if player entered a new chunk
          const { wx, wy } = this.chunkForAxial(q, r);
          if (wx !== this.centerChunk.x || wy !== this.centerChunk.y) {
            // Spawn new chunks immediately; do not delay recentering
            this.setCenterChunk(wx, wy);
          }
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
      const targets = (this.pickMeshes || []).filter(Boolean);
      if (targets.length === 0) {
        this.hoverIdx = null;
        if (this.hoverMesh) this.hoverMesh.visible = false;
        return;
      }
      const intersects = this.raycaster.intersectObjects(targets, true);
      if (intersects.length > 0) {
        const hit = intersects[0];
        const idx = hit.instanceId;
        if (idx != null && this.topIM) {
          if (this.hoverMesh) {
            const m = this.composeTileMatrix(idx, 'top');
            this.hoverMesh.matrix.copy(m);
            this.hoverMesh.visible = true;
          }
          this.hoverIdx = idx;
          // Update player marker preview to current hover using world position
          if (this.playerMarker) {
            const ps = this.computeTilePosScale(idx, 'top');
            const pos = new THREE.Vector3(ps.x, this.hexMaxY * ps.scaleY + 0.01, ps.z);
            this.playerMarker.setWorldPosition(pos);
          }
        }
      } else {
        this.hoverIdx = null;
        if (this.hoverMesh) this.hoverMesh.visible = false;
      }
    },
    onPointerUp() {
      // Ensure rotation stops on pointerup or when the pointer leaves the scene
      // (pointerleave events don't report the original button).
      this.rotating = false;
    },
    scheduleChunkRecentering(wx, wy, delayMs = 3000) {
      // Currently we spawn new chunks immediately via setCenterChunk.
      // This hook can be used to delay disposal of any old resources if needed.
      // No-op for now because we reuse fixed instanced slots (no per-chunk meshes to delete).
      // Keeping it for future extension (e.g., async asset streaming, texture unloading).
      void wx; void wy; void delayMs;
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
        if (cell && cell.biome !== 'deepWater' && cell.biome !== 'shallowWater' ) return idx;
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
        geomBox.getCenter(center);
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
  this.locationMarker = markRaw(marker);
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
        // Compose from attribute-based transform (center + scales)
        const ps = this.computeTilePosScale(idx, 'top');
        const pos = new THREE.Vector3(ps.x, this.hexMaxY * ps.scaleY + 0.05 * this.layoutRadius, ps.z);
        const markerQuat = new THREE.Quaternion();
        const markerScale = this.locationMarker.scale.clone();
        this.locationMarker.matrix.compose(pos, markerQuat, markerScale);
        this.locationMarker.visible = true;
      });
    },
    // Helpers: compose per-tile transforms mirroring shader attribute path
    computeTilePosScale(idx, bucket = 'top') {
      const info = (this.indexToQR && this.indexToQR[idx]) ? this.indexToQR[idx] : null;
      if (!info) return { x: 0, z: 0, scaleY: 1 };
      const q = info.q, r = info.r;
      const hexW = this.layoutRadius * 1.5 * this.spacingFactor;
      const hexH = Math.sqrt(3) * this.layoutRadius * this.spacingFactor;
      const x = hexW * q;
      const z = hexH * (r + q / 2);
      const cell = this.world.getCell(q, r);
      const isWater = !!(cell && (cell.biome === 'deepWater' || cell.biome === 'shallowWater'));
      const scaleY = isWater ? Math.max(0.001, 0.02 * (this.modelScaleFactor || 1)) : (this.modelScaleFactor * (cell ? cell.yScale : 1) * (this.heightMagnitude != null ? this.heightMagnitude : 1.0));
      const xzScale = (this.modelScaleFactor || 1) * this.contactScale * (bucket === 'side' ? (this.sideInset != null ? this.sideInset : 0.996) : 1.0);
      return { x, z, scaleY, xzScale };
    },
    composeTileMatrix(idx, bucket = 'top') {
      const ps = this.computeTilePosScale(idx, bucket);
      const m = new THREE.Matrix4();
      const pos = new THREE.Vector3(ps.x, 0, ps.z);
      const quat = new THREE.Quaternion();
      const scl = new THREE.Vector3(ps.xzScale, ps.scaleY, ps.xzScale);
      m.compose(pos, quat, scl);
      return m;
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
    },
    runBenchmark() {
      if (this.benchmark.running) return;
      // Reset and start
      const b = this.benchmark;
      b.running = true;
      b.startedAt = performance.now();
      b.frames = 0;
      b.sum = 0;
      b.min = Infinity;
      b.max = -Infinity;
      b.result = null;
  this._lastFrameTs = null;
      // Also momentarily disable FXAA to measure raw render if desired in future; keep current behavior unchanged
    },
    onGenerationScaleChange() {
      // Clamp defensively
  if (this.generation.scale == null || !isFinite(this.generation.scale) || this.generation.scale <= 0) this.generation.scale = 1.0;
      // Apply to world and refresh visible content
      if (this.world) {
        this.world.generationScale = this.generation.scale;
        // Refill the current 3x3 neighborhood
        if (this.centerChunk) this.setCenterChunk(this.centerChunk.x, this.centerChunk.y);
        // Rebuild water and sand underlay only in non-chunk grid mode
        if (!this.countPerChunk) this.buildWater();
        // Recommit clutter so placements match the new biomes
        this.scheduleClutterCommit(0);
      }
    },
    onGeneratorTuningChange() {
      // Clamp defensively and apply tuning to the generator
      if (!this.generation.tuning) this.generation.tuning = {};
      const t = this.generation.tuning;
  const sanitize = (v, def = 1.0) => (v == null || !isFinite(v) || v === 0) ? def : v;
  t.continentScale = sanitize(t.continentScale);
  t.warpScale = sanitize(t.warpScale);
  t.warpStrength = sanitize(t.warpStrength);
  t.plateSize = sanitize(t.plateSize);
  t.ridgeScale = sanitize(t.ridgeScale);
  t.detailScale = sanitize(t.detailScale);
  t.climateScale = sanitize(t.climateScale);
  if (this.world && this.world.setGeneratorTuning) this.world.setGeneratorTuning(t);
  // Refresh visible neighborhood so changes take effect immediately; force a refill of cached chunks
  if (this.centerChunk) this.setCenterChunk(this.centerChunk.x, this.centerChunk.y, { forceRefill: true });
  // Rebuild water textures/mask to match updated elevation/biomes
  this.buildWater();
      this.scheduleClutterCommit(0);
      if (this.settings?.mergeAtPath) this.settings.mergeAtPath({ path: 'worldMap', value: { generation: this.generation } });
    },
    onGeneratorVersionChange() {
      if (this.world && this.world.setGeneratorVersion) {
        this.world.setGeneratorVersion(this.generation.version);
        // Clear tuning so the new generator's defaults are used
        this.generation.tuning = {};
        if (this.centerChunk) this.setCenterChunk(this.centerChunk.x, this.centerChunk.y, { forceRefill: true });
        this.buildWater();
        this.scheduleClutterCommit(0);
      }
      if (this.settings?.mergeAtPath) this.settings.mergeAtPath({ path: 'worldMap', value: { generation: this.generation } });
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
        this.keyLight.shadow.bias = -0.0001;
        this.keyLight.shadow.normalBias = 0.2;
        cam.updateProjectionMatrix();
      }
      // Clutter instances (prefer ChunkManager's service)
      const shadowSvc = (this.chunkManager && this.chunkManager.clutter) ? this.chunkManager.clutter : this.clutter;
      if (shadowSvc && shadowSvc.setShadows) shadowSvc.setShadows(!!enabled);
      // Location marker: cast and receive
      if (this.locationMarker) {
        const setShadows = (node) => {
          if (node && node.isMesh) {
            const mesh = node;
            mesh.castShadow = !!enabled;
            mesh.receiveShadow = !!enabled;
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
