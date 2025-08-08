<template>
  <div
    ref="sceneContainer"
    class="world-map"
    style="width: 100%; height: 100vh;"
  />
</template>

<script>
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import { HorizontalTiltShiftShader } from 'three/examples/jsm/shaders/HorizontalTiltShiftShader.js';
import { VerticalTiltShiftShader } from 'three/examples/jsm/shaders/VerticalTiltShiftShader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import SimplexNoise from 'simplex-noise';
import api from '@/functions/api';
import { BIOME_THRESHOLDS } from '@/terrain/biomes';
import WorldGrid from '@/world/WorldGrid';
import PlayerMarker from '@/renderer/PlayerMarker';
import ClutterManager from '@/world/ClutterManager';

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
  // Location marker (GLB)
  locationMarker: null,
  markerDesiredRadius: 0.6, // as fraction of layoutRadius
  hexMaxY: 1, // max Y of a tile in local space after recenter
  cameraTween: null,
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
  contactScale: 1.015, // initialized; auto-computed after load
  contactBias: 1.0, // additional multiplier (keep at 1.0 when using gapFraction)
  gapFraction: 0.03, // desired gap size as a fraction of layoutRadius (e.g., 3%)

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
  hTiltPass: null,
  vTiltPass: null,
  tiltShiftEnabled: true,
  tiltShiftRadius: 0.285, // halfway between 0.35 (old) and 0.22 (current)
  tiltShiftStrength: 1.375, // halfway between 1.0 (old) and 1.75 (current)
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

  // Tilt-shift passes (before FXAA)
  const pr = this.renderer.getPixelRatio();
  this.hTiltPass = new ShaderPass(HorizontalTiltShiftShader);
  this.vTiltPass = new ShaderPass(VerticalTiltShiftShader);
  this.hTiltPass.uniforms.h.value = (this.tiltShiftStrength || 1) * (1 / (width * pr));
  this.hTiltPass.uniforms.r.value = this.tiltShiftRadius;
  this.vTiltPass.uniforms.v.value = (this.tiltShiftStrength || 1) * (1 / (height * pr));
  this.vTiltPass.uniforms.r.value = this.tiltShiftRadius;
  this.hTiltPass.enabled = this.tiltShiftEnabled;
  this.vTiltPass.enabled = this.tiltShiftEnabled;
  this.composer.addPass(this.hTiltPass);
  this.composer.addPass(this.vTiltPass);

  this.fxaaPass = new ShaderPass(FXAAShader);
  this.fxaaPass.material.uniforms.resolution.value.set(1 / (width * pr), 1 / (height * pr));
  this.composer.addPass(this.fxaaPass);

  const ambient = new THREE.AmbientLight(0xffffff, 0.4);
      const keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
      keyLight.position.set(22, 40, 28);
      this.scene.add(ambient, keyLight);

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
          const applied = Math.max(0.5, Math.min(1.5, suggested * (this.contactBias || 1.0)));
          this.contactScale = applied;
          console.info('[WorldMap] gapFraction =', (this.gapFraction || 0).toFixed(4), 'suggested contactScale =', suggested.toFixed(4), 'applied =', applied.toFixed(4));
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
      // Prepare clutter for the current grid (placeholder)
      if (this.clutter) this.clutter.prepareFromGrid(this.world);
      if (this.clutter) this.clutter.addTo(this.scene);
      // Initial marker placement on a random land tile and smooth focus
      const startIdx = this.chooseRandomTileIndex({ landOnly: true });
      if (startIdx != null) {
        this.addLocationMarkerAtIndex(startIdx);
        this.focusCameraOnIndex(startIdx, { smooth: true, duration: 900 });
      }
      // Create a single hover overlay mesh to avoid relying on instance colors
      if (!this.hoverMesh) {
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
      }
      this.pickMeshes = [this.topIM, this.sideIM];
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
        if (t >= 1) this.cameraTween.active = false;
      }
      this.composer.render();
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
  if (this.hTiltPass) this.hTiltPass.uniforms.h.value = (this.tiltShiftStrength || 1) * (1 / (width * pr));
  if (this.vTiltPass) this.vTiltPass.uniforms.v.value = (this.tiltShiftStrength || 1) * (1 / (height * pr));
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
        marker.visible = false;
        marker.matrixAutoUpdate = false;
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
