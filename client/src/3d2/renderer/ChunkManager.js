import * as THREE from 'three';
import { createInstancedMesh } from '@/3d2/renderer/instancing';

// Simplified ChunkManager for 3d2. This is intentionally smaller than the legacy
// version: it provides the same external API surface (build, scheduleProgressiveExpand,
// startProgressive, stopProgressive, dispose, applyChunkColors, setCenterChunk,
// commitClutterForNeighborhood, scheduleClutterCommit, clearClutterCommit) but
// implements a minimal neighborhood builder locally so it has no dependency on
// `client/src/3d` code.

export default class ChunkManager {
  constructor(opts = {}) {
    this.scene = opts.scene;
    this.world = opts.world;
    this.layoutRadius = opts.layoutRadius || 1;
    this.spacingFactor = opts.spacingFactor || 1;
    this.modelScaleFactor = opts.modelScaleFactor || 1;
    this.contactScale = opts.contactScale || 1;
    this.sideInset = opts.sideInset ?? 0.996;
    this.chunkCols = opts.chunkCols || 8;
    this.chunkRows = opts.chunkRows || 8;
    this.neighborRadius = opts.neighborRadius ?? 1;
    this.features = opts.features || {};
    this.heightMagnitude = opts.heightMagnitude != null ? opts.heightMagnitude : 1.0;
    this.centerChunk = { x: opts.centerChunk?.x ?? 0, y: opts.centerChunk?.y ?? 0 };

    // callbacks
    this.onBuilt = opts.onBuilt || (() => {});
    this.onPickMeshes = opts.onPickMeshes || (() => {});
    this.pastelColorForChunk = opts.pastelColorForChunk || (() => new THREE.Color(0xffffff));

    // streaming controls (no-op in simplified manager but kept for API compatibility)
    this.streamBudgetMs = opts.streamBudgetMs ?? 6;
    this.streamMaxChunksPerTick = opts.streamMaxChunksPerTick ?? 0;
    this.rowsPerSlice = opts.rowsPerSlice ?? 4;

    // internal
    this.neighborhood = null;
    this.streaming = false;
    this._progressiveCheckId = null;
    this._clutterCommitTimer = null;
  }

  // Build a simple neighborhood using instanced meshes generated from provided geometries.
  // Returns a small built object and sets this.neighborhood.
  async build(topGeom, sideGeom) {
    // dispose previous
    if (this.neighborhood && this.neighborhood.dispose) {
      try { this.neighborhood.dispose(); } catch (e) { /* ignore */ }
      this.neighborhood = null;
    }

    const radius = this.neighborRadius || 1;
    const positions = [];
    const HEX_SIZE = 2.0 * this.layoutRadius * this.spacingFactor;
    for (let q = -radius; q <= radius; q++) {
      for (let r = Math.max(-radius, -q - radius); r <= Math.min(radius, -q + radius); r++) {
        const x = HEX_SIZE * 1.5 * q;
        const z = HEX_SIZE * Math.sqrt(3) * (r + q / 2);
        positions.push({ x, z });
      }
    }

    const count = positions.length;
    // create simple instanced top mesh
    const topGeometry = topGeom || new THREE.CylinderGeometry(0.7, 0.7, 0.2, 6);
    const topMaterial = new THREE.MeshLambertMaterial({ color: 0xeeeeee });
    const topApi = createInstancedMesh(topGeometry, topMaterial, count);
    const topIM = topApi.instancedMesh;
    for (let i = 0; i < positions.length; i++) {
      const p = positions[i];
      topApi.setInstanceMatrix(i, { x: p.x, y: 0, z: p.z });
    }

    // create side instanced mesh (optional simplified)
    const sideGeometry = sideGeom || new THREE.CylinderGeometry(0.7, 0.7, 0.2, 6);
    const sideMaterial = new THREE.MeshLambertMaterial({ color: 0xcccccc });
    const sideApi = createInstancedMesh(sideGeometry, sideMaterial, count);
    const sideIM = sideApi.instancedMesh;
    for (let i = 0; i < positions.length; i++) {
      const p = positions[i];
      sideApi.setInstanceMatrix(i, { x: p.x, y: -0.1, z: p.z });
    }

    // simple hover mesh: a single mesh that can be positioned by callers
    const hoverMat = new THREE.MeshBasicMaterial({ color: 0xffff00, wireframe: true });
    const hoverMesh = new THREE.Mesh(topGeometry.clone(), hoverMat);
    hoverMesh.visible = false;
    hoverMesh.matrixAutoUpdate = false;

    // add to scene
    try {
      if (this.scene) {
        this.scene.add(topIM);
        this.scene.add(sideIM);
        this.scene.add(hoverMesh);
      }
    } catch (e) {
      console.warn('ChunkManager: add to scene failed', e);
    }

    const neighborhood = {
      topIM,
      sideIM,
      hoverMesh,
      count,
      dispose() {
        try { topIM.geometry && topIM.geometry.dispose && topIM.geometry.dispose(); } catch (e) { console.warn('ChunkManager: dispose top geometry failed', e); }
        try { topIM.material && topIM.material.dispose && topIM.material.dispose(); } catch (e) { console.warn('ChunkManager: dispose top material failed', e); }
        try { sideIM.geometry && sideIM.geometry.dispose && sideIM.geometry.dispose(); } catch (e) { console.warn('ChunkManager: dispose side geometry failed', e); }
        try { sideIM.material && sideIM.material.dispose && sideIM.material.dispose(); } catch (e) { console.warn('ChunkManager: dispose side material failed', e); }
        try { hoverMesh.geometry && hoverMesh.geometry.dispose && hoverMesh.geometry.dispose(); } catch (e) { console.warn('ChunkManager: dispose hover geometry failed', e); }
        try { hoverMesh.material && hoverMesh.material.dispose && hoverMesh.material.dispose(); } catch (e) { console.warn('ChunkManager: dispose hover material failed', e); }
        try { if (this.scene) { this.scene.remove(topIM); this.scene.remove(sideIM); this.scene.remove(hoverMesh); } } catch (e) { console.warn('ChunkManager: remove from scene failed', e); }
      },
      applyChunkColors: (enabled) => {
        try {
          if (enabled) {
            topIM.material.color.setHex(0xffdddd);
            sideIM.material.color.setHex(0xdddddd);
          } else {
            topIM.material.color.setHex(0xeeeeee);
            sideIM.material.color.setHex(0xcccccc);
          }
        } catch (e) { console.warn('ChunkManager: applyChunkColors failed', e); }
      },
    };

    this.neighborhood = neighborhood;
    const built = { topIM, sideIM, hoverMesh, count, neighborhood };

    // callbacks
  try { this.onBuilt(built); } catch (e) { console.warn('ChunkManager: onBuilt callback error', e); }
  try { this.onPickMeshes([topIM, sideIM]); } catch (e) { console.warn('ChunkManager: onPickMeshes callback error', e); }

    return built;
  }

  scheduleProgressiveExpand(targetRadius, callbacks = {}) {
  try { if (this._progressiveCheckId) cancelAnimationFrame(this._progressiveCheckId); } catch (e) { console.warn('ChunkManager: cancel progressive expand failed', e); }
    const self = this;
    const check = () => {
      if (!self.streaming) {
      if ((self.neighborRadius || 1) < targetRadius) {
          self.neighborRadius = targetRadius;
          try {
            self.build(self._lastTopGeom, self._lastSideGeom).then(() => {
        try { callbacks.onComplete && callbacks.onComplete(); } catch (e) { console.warn('ChunkManager: onComplete callback error', e); }
            }).catch(() => {});
      } catch (err) { console.warn('ChunkManager: progressive build scheduling failed', err); }
        }
        self._progressiveCheckId = null;
      } else {
        self._progressiveCheckId = requestAnimationFrame(check);
      }
    };
    try { this._progressiveCheckId = requestAnimationFrame(check); } catch (e) { setTimeout(check, 16); }
  }

  cancelProgressiveExpand() {
  try { if (this._progressiveCheckId) cancelAnimationFrame(this._progressiveCheckId); } catch (e) { console.warn('ChunkManager: cancel progressive expand failed', e); }
    this._progressiveCheckId = null;
  }

  startProgressive(targetRadius) {
    this._progressiveTarget = targetRadius;
    this.scheduleProgressiveExpand(targetRadius, { onComplete: () => { this._progressiveTarget = null; } });
  }

  stopProgressive() {
    this._progressiveTarget = null;
    this.cancelProgressiveExpand();
  }

  dispose() {
  try { if (this.neighborhood && this.neighborhood.dispose) this.neighborhood.dispose(); } catch (e) { console.warn('ChunkManager: dispose failed', e); }
    this.neighborhood = null;
  }

  applyChunkColors(enabled) {
    if (this.neighborhood && this.neighborhood.applyChunkColors) this.neighborhood.applyChunkColors(!!enabled);
  }

  setCenterChunk(wx, wy, options = {}) {
  // no-op simple implementation; keep signature for compatibility
  void options; // silence unused param lint
  this.centerChunk = { x: wx, y: wy };
  }

  commitClutterForNeighborhood() {
    // no-op in simplified manager; kept for compatibility
  }

  scheduleClutterCommit(delayMs = 120) {
  try { if (this._clutterCommitTimer) { clearTimeout(this._clutterCommitTimer); this._clutterCommitTimer = null; } } catch (e) { console.warn('ChunkManager: clearing clutter commit timer failed', e); }
  this._clutterCommitTimer = setTimeout(() => { this._clutterCommitTimer = null; this.commitClutterForNeighborhood(); }, Math.max(0, delayMs | 0));
  }

  clearClutterCommit() {
  try { if (this._clutterCommitTimer) { clearTimeout(this._clutterCommitTimer); this._clutterCommitTimer = null; } } catch (e) { console.warn('ChunkManager: clearClutterCommit failed', e); }
  }
}

export function createChunkManager(opts) { return new ChunkManager(opts); }
