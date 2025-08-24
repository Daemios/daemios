import * as THREE from 'three';
import { createInstancedMesh, setInstanceColors } from '@/3d2/renderer/instancing';
import { axialToXZ } from '@/3d2/renderer/coordinates';
import { offsetToAxial } from '@/3d/utils/hexUtils';
import { biomeFromCell } from '@/3d2/domain/world/biomes';

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
    this.spacingFactor = opts.spacingFactor || 0.85;
    this.modelScaleFactor = opts.modelScaleFactor || 1;
    this.contactScale = opts.contactScale || 1;
    this.sideInset = opts.sideInset ?? 0.996;
    this.chunkCols = opts.chunkCols || 8;
    this.chunkRows = opts.chunkRows || 8;
    this.neighborRadius = opts.neighborRadius ?? 1;
    this.features = opts.features || {};
    this.heightMagnitude = opts.heightMagnitude != null ? opts.heightMagnitude : 1.0;
    this.centerChunk = { x: opts.centerChunk?.x ?? 0, y: opts.centerChunk?.y ?? 0 };
  // optional generator for sampling cell data (expects get(q,r) -> cell)
  this.generator = opts.generator || null;

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
      try { this.neighborhood.dispose(); } catch (e) { console.warn('ChunkManager: dispose previous failed', e); }
      this.neighborhood = null;
    }

    // compute a rectangular chunk region centered on this.centerChunk using chunkCols/chunkRows
    const positions = [];
    // compute neighborhood spanning multiple chunks based on neighborRadius
    const cx = (this.centerChunk && typeof this.centerChunk.x === 'number') ? this.centerChunk.x : 0;
    const cy = (this.centerChunk && typeof this.centerChunk.y === 'number') ? this.centerChunk.y : 0;
    const cols = this.chunkCols || 8;
    const rows = this.chunkRows || 8;
    const nr = this.neighborRadius != null ? this.neighborRadius : 1;

    // Helper: compute world-space bbox for a given chunk index by sampling
    // all axial coords that belong to that chunk. This yields robust chunk
    // bounds that respect hex layout staggering. Chunks are defined as axial
    // ranges [chunkX*cols .. chunkX*cols + cols-1] x [chunkY*rows .. chunkY*rows+rows-1].
    // Compute world bbox for a chunk by iterating offset coords so chunk
    // boundaries are aligned in offset (col,row) space. This ensures chunks
    // tessellate into a rectangular tiling when projected into world space.
    const chunkToWorldBBox = (chunkX, chunkY) => {
      const colStart = chunkX * cols;
      const colEnd = colStart + cols - 1;
      const rowStart = chunkY * rows;
      const rowEnd = rowStart + rows - 1;
      let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
      for (let col = colStart; col <= colEnd; col++) {
        for (let row = rowStart; row <= rowEnd; row++) {
          const ax = offsetToAxial(col, row);
          const pos = axialToXZ(ax.q, ax.r, { layoutRadius: this.layoutRadius, spacingFactor: this.spacingFactor });
          if (pos.x < minX) minX = pos.x;
          if (pos.x > maxX) maxX = pos.x;
          if (pos.z < minZ) minZ = pos.z;
          if (pos.z > maxZ) maxZ = pos.z;
        }
      }
      if (!isFinite(minX)) return null;
      return { minX, maxX, minZ, maxZ };
    };

    // Compute union bbox across the chunk neighborhood (aligned to chunk boundaries
    // in chunk-space). This produces a world-space bbox where chunk borders align
    // with the grid used for sampling which ensures chunks fit together seamlessly.
    let unionMinX = Infinity, unionMaxX = -Infinity, unionMinZ = Infinity, unionMaxZ = -Infinity;
    const chunkRange = [];
    for (let cxIdx = cx - nr; cxIdx <= cx + nr; cxIdx++) {
      for (let cyIdx = cy - nr; cyIdx <= cy + nr; cyIdx++) {
        const bb = chunkToWorldBBox(cxIdx, cyIdx);
        if (!bb) continue;
        chunkRange.push({ x: cxIdx, y: cyIdx, bbox: bb });
        if (bb.minX < unionMinX) unionMinX = bb.minX;
        if (bb.maxX > unionMaxX) unionMaxX = bb.maxX;
        if (bb.minZ < unionMinZ) unionMinZ = bb.minZ;
        if (bb.maxZ > unionMaxZ) unionMaxZ = bb.maxZ;
      }
    }
    if (!isFinite(unionMinX)) return [];

    // Center and side length for a square sampling area that covers the union bbox
    const centerX = (unionMinX + unionMaxX) / 2;
    const centerZ = (unionMinZ + unionMaxZ) / 2;
    const width = unionMaxX - unionMinX;
    const height = unionMaxZ - unionMinZ;
    const side = Math.max(width, height);
    const half = side / 2;

  // sample a regular grid of world-space points across the square and map back
  // to nearest axial q,r coordinates. We enumerate axial coords per-chunk below
  // so explicit spacing for sampling is not required here.
    // Enumerate axial coordinates per chunk so each chunk contains the exact
    // block of axial cells [qStart..qEnd] x [rStart..rEnd]. This eliminates
    // partial chunks at neighborhood borders and guarantees chunks tessellate.
    for (const chunk of chunkRange) {
      const chunkX = chunk.x;
      const chunkY = chunk.y;
      const colStart = chunkX * cols;
      const colEnd = colStart + cols - 1;
      const rowStart = chunkY * rows;
      const rowEnd = rowStart + rows - 1;
      for (let col = colStart; col <= colEnd; col++) {
        for (let row = rowStart; row <= rowEnd; row++) {
          const ax = offsetToAxial(col, row);
          const pos = axialToXZ(ax.q, ax.r, { layoutRadius: this.layoutRadius, spacingFactor: this.spacingFactor });
          positions.push({ x: pos.x, z: pos.z, q: ax.q, r: ax.r, chunkX, chunkY });
        }
      }
    }

    // store last computed neighborhood metadata for debugging and reuse
    this._lastNeighborhood = { centerX, centerZ, half, chunkRange };

  const count = positions.length;
  // capture manager context for closures so dispose can remove from the correct scene
  const manager = this;
  // computed positions count removed (diagnostics cleaned)
    // create simple instanced top mesh
    // Choose geometries. If no model-provided geoms are supplied, use a thin top cap
    // positioned above the side geometry to avoid z-fighting.
    const usingDefaultGeom = !topGeom || !sideGeom;
    const sideGeometry = sideGeom || new THREE.CylinderGeometry(0.7, 0.7, 0.2, 6);
    const sideMaterial = new THREE.MeshLambertMaterial({ color: 0xcccccc });
    const sideApi = createInstancedMesh(sideGeometry, sideMaterial, count);
    const sideIM = sideApi.instancedMesh;

    let topGeometry;
    let topMaterial = new THREE.MeshLambertMaterial({ color: 0xeeeeee });
    if (usingDefaultGeom) {
  // Use a flat disk for the top cap to avoid creating side faces that overlap
  // the side geometry (which caused z-fighting). CircleGeometry is created
  // in the XY plane; rotate it into the XZ plane so its normal points up.
  topGeometry = new THREE.CircleGeometry(0.7, 6);
  topGeometry.rotateX(-Math.PI / 2);
    } else {
      topGeometry = topGeom;
    }
  const topApi = createInstancedMesh(topGeometry, topMaterial, count);
  const topIM = topApi.instancedMesh;

  // prepare color arrays for per-instance coloring and per-instance scaling
  const topColorsBiome = new Float32Array(positions.length * 3);
  const sideColorsBiome = new Float32Array(positions.length * 3);
  const topColorsChunk = new Float32Array(positions.length * 3);
  const sideColorsChunk = new Float32Array(positions.length * 3);
    for (let i = 0; i < positions.length; i++) {
      const p = positions[i];
      let yScale = 1.0;
      let topCol = new THREE.Color(0xeeeeee);
      let sideCol = new THREE.Color(0xcccccc);
      try {
        if (this.generator && typeof this.generator.get === 'function') {
          const tile = this.generator.get(p.q, p.r);
          const bio = biomeFromCell(tile);
          // Expect tile shape: prefer tile.height, then tile.elevation.normalized
          let elev = 0;
          if (tile && typeof tile.height === 'number') elev = tile.height;
          else if (tile && tile.elevation && typeof tile.elevation.normalized === 'number') elev = tile.elevation.normalized;
          yScale = Math.max(0.001, elev * (this.heightMagnitude || 1.0));
          topCol = new THREE.Color(bio && bio.top ? bio.top : 0xeeeeee);
          sideCol = new THREE.Color(bio && bio.side ? bio.side : 0xcccccc);
        }
      } catch (e) {
        console.warn('ChunkManager: sampling generator failed', e);
      }
      // Place side centered at world y=0 (height 0.2 -> -0.1..0.1). Place top cap above it.
      if (usingDefaultGeom) {
        const sideY = 0; // center of side
        const sideHalf = 0.2 / 2;
        // top is a flat disk (no vertical thickness) so place it just above the
        // side's top surface by a tiny epsilon to avoid coplanar overlap.
        const topY = sideY + sideHalf + 0.0005; // tiny epsilon gap
        topApi.setInstanceMatrix(i, { x: p.x, y: topY, z: p.z }, { x: 0, y: 0, z: 0 }, { x: 1.0, y: 1.0, z: 1.0 });
        sideApi.setInstanceMatrix(i, { x: p.x, y: sideY, z: p.z }, { x: 0, y: 0, z: 0 }, { x: 1.0, y: yScale, z: 1.0 });
      } else {
        // model-provided geometry: keep original alignment but add tiny epsilon to top to reduce z-fighting
        topApi.setInstanceMatrix(i, { x: p.x, y: 0.0005, z: p.z }, { x: 0, y: 0, z: 0 }, { x: 1.0, y: yScale, z: 1.0 });
        sideApi.setInstanceMatrix(i, { x: p.x, y: -0.1, z: p.z }, { x: 0, y: 0, z: 0 }, { x: 1.0, y: yScale, z: 1.0 });
      }
      // store biome colors
      topColorsBiome[i * 3 + 0] = topCol.r;
      topColorsBiome[i * 3 + 1] = topCol.g;
      topColorsBiome[i * 3 + 2] = topCol.b;
      sideColorsBiome[i * 3 + 0] = sideCol.r;
      sideColorsBiome[i * 3 + 1] = sideCol.g;
      sideColorsBiome[i * 3 + 2] = sideCol.b;
      // compute chunk coords and pastel color for chunk
      try {
  const chunkX = (typeof p.chunkX === 'number') ? p.chunkX : Math.floor(p.q / (this.chunkCols || 8));
  const chunkY = (typeof p.chunkY === 'number') ? p.chunkY : Math.floor(p.r / (this.chunkRows || 8));
  let c = (this.pastelColorForChunk && typeof this.pastelColorForChunk === 'function') ? this.pastelColorForChunk(chunkX, chunkY) : new THREE.Color(0xffffff);
        // If the provided color is nearly white (e.g., model returned white), synthesize a clearer pastel
        try {
          const maxCh = Math.max(c.r || 0, c.g || 0, c.b || 0);
          if (maxCh > 0.95) {
            const seed = Math.abs(Math.sin(chunkX * 12.9898 + chunkY * 78.233) * 43758.5453);
            const h = seed - Math.floor(seed);
            const s = 0.55;
            const l = 0.72;
            c = new THREE.Color();
            c.setHSL(h, s, l);
          }
        } catch (e) {
          // ignore and use original color
        }
        topColorsChunk[i * 3 + 0] = c.r;
        topColorsChunk[i * 3 + 1] = c.g;
        topColorsChunk[i * 3 + 2] = c.b;
        sideColorsChunk[i * 3 + 0] = c.r;
        sideColorsChunk[i * 3 + 1] = c.g;
        sideColorsChunk[i * 3 + 2] = c.b;
      } catch (e) {
        // fallback to biome color if chunk color computation fails
        topColorsChunk[i * 3 + 0] = topCol.r;
        topColorsChunk[i * 3 + 1] = topCol.g;
        topColorsChunk[i * 3 + 2] = topCol.b;
        sideColorsChunk[i * 3 + 0] = sideCol.r;
        sideColorsChunk[i * 3 + 1] = sideCol.g;
        sideColorsChunk[i * 3 + 2] = sideCol.b;
      }
    }

    // attach instanceColor attributes where supported
    // initially use biome colors for instanceColor; store both buffers on neighborhood
    try {
      // Use centralized helper to set instance colors (will reuse arrays when possible)
      setInstanceColors(topIM, topColorsBiome);
      setInstanceColors(sideIM, sideColorsBiome);
    } catch (e) {
      // fallback handled below
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

  // chunk border debug helper removed

    const neighborhood = {
      topIM,
      sideIM,
      hoverMesh,
      count,
      // keep color buffers for toggling
      _topColorsBiome: topColorsBiome,
      _sideColorsBiome: sideColorsBiome,
      _topColorsChunk: topColorsChunk,
      _sideColorsChunk: sideColorsChunk,
  _positions: positions,
      dispose: () => {
        try { topIM.geometry && topIM.geometry.dispose && topIM.geometry.dispose(); } catch (e) { console.warn('ChunkManager: dispose top geometry failed', e); }
        try { topIM.material && topIM.material.dispose && topIM.material.dispose(); } catch (e) { console.warn('ChunkManager: dispose top material failed', e); }
        try { sideIM.geometry && sideIM.geometry.dispose && sideIM.geometry.dispose(); } catch (e) { console.warn('ChunkManager: dispose side geometry failed', e); }
        try { sideIM.material && sideIM.material.dispose && sideIM.material.dispose(); } catch (e) { console.warn('ChunkManager: dispose side material failed', e); }
        try { hoverMesh.geometry && hoverMesh.geometry.dispose && hoverMesh.geometry.dispose(); } catch (e) { console.warn('ChunkManager: dispose hover geometry failed', e); }
  try { hoverMesh.material && hoverMesh.material.dispose && hoverMesh.material.dispose(); } catch (e) { console.warn('ChunkManager: dispose hover material failed', e); }
  try { if (manager && manager.scene) { manager.scene.remove(topIM); manager.scene.remove(sideIM); manager.scene.remove(hoverMesh); } } catch (e) { console.warn('ChunkManager: remove from scene failed', e); }
  // chunk border cleanup removed
      },
      applyChunkColors: (enabled) => {
        try {
          // Prefer reusing the existing InstancedBufferAttribute arrays to avoid
          // repeated allocations and potential resource churn. If the attribute
          // exists and sizes match, copy the alternate buffer into the existing
          // array and mark needsUpdate. Otherwise fall back to swapping in a
          // new attribute (rare).
          try {
            const useTopChunk = enabled ? neighborhood._topColorsChunk : neighborhood._topColorsBiome;
            const useSideChunk = enabled ? neighborhood._sideColorsChunk : neighborhood._sideColorsBiome;

            try { setInstanceColors(topIM, useTopChunk); setInstanceColors(sideIM, useSideChunk); return; } catch (e) { /* fall through */ }
          } catch (e) {
            // fall through to material-based tinting
          }

          // Fallback: set material uniform tint when per-instance color not available
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
  // remember last geoms so rebuilds can reuse them
  this._lastTopGeom = topGeom;
  this._lastSideGeom = sideGeom;
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
