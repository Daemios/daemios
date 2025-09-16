import * as THREE from 'three';
import { createInstancedMesh, setInstanceColors } from '@/3d2/renderer/instancing';
import { axialToXZ, XZToAxial } from '@/3d2/renderer/coordinates';
import { biomeFromCell } from '@/3d2/domain/world/biomes';
import { DEFAULT_CONFIG } from '../../../../shared/lib/worldgen/config.js';

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
    this.spacingFactor = (typeof opts.spacingFactor === 'number') ? opts.spacingFactor : 1;
    this.modelScaleFactor = opts.modelScaleFactor || 1;
  // native geometry max Y (in model units) after any loader normalization
  this.hexMaxYNative = typeof opts.hexMaxY === 'number' ? opts.hexMaxY : 1.0;
    this.contactScale = opts.contactScale || 1;
    this.sideInset = opts.sideInset ?? 0.996;
    this.chunkCols = opts.chunkCols || 8;
    this.chunkRows = opts.chunkRows || 8;
    this.neighborRadius = opts.neighborRadius ?? 1;
    this.features = opts.features || {};
  // Use centralized DEFAULT_CONFIG.heightMagnitude as renderer exaggeration.
  // Allow opts to override for testing; fall back to 1.0 if not present.
  this.heightMagnitude = opts.heightMagnitude != null ? opts.heightMagnitude : (DEFAULT_CONFIG && typeof DEFAULT_CONFIG.heightMagnitude === 'number' ? DEFAULT_CONFIG.heightMagnitude : 1.0);
    this.centerChunk = { x: opts.centerChunk?.x ?? 0, y: opts.centerChunk?.y ?? 0 };
  // optional generator for sampling cell data (expects getByXZ(x,z) -> cell)
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

    // Helper: convert even-q offset (col,row) to axial (q,r)
    // We used to import this from the legacy `@/3d/utils/hexUtils` but that
    // module has been removed; provide a tiny local implementation here.
    const offsetToAxial = (col, row) => {
      const q = col;
      const r = row - Math.floor(col / 2);
      return { q, r };
    };

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
          // Compute coordinates for rendering using the configured spacingFactor
          const pos = axialToXZ(ax.q, ax.r, {
            layoutRadius: this.layoutRadius,
            spacingFactor: this.spacingFactor
          });
          // Compute uncompressed world coordinates for generator sampling with spacingFactor 1
          const samplePos = axialToXZ(ax.q, ax.r, {
            layoutRadius: this.layoutRadius,
            spacingFactor: 1
          });
          const axial = XZToAxial(pos.x, pos.z, {
            layoutRadius: this.layoutRadius,
            spacingFactor: this.spacingFactor
          });
          positions.push({
            x: pos.x,
            z: pos.z,
            worldX: samplePos.x,
            worldZ: samplePos.z,
            q: axial.q,
            r: axial.r,
            chunkX,
            chunkY
          });
        }
      }
    }

    // store last computed neighborhood metadata for debugging and reuse
    this._lastNeighborhood = { centerX, centerZ, half, chunkRange };

  const count = positions.length;
  // capture manager context for closures so dispose can remove from the correct scene
  const manager = this;
  // computed positions count removed (diagnostics cleaned)
    // Expect model-provided top and side geometries. Fail-fast if missing so
    // upstream code can surface model export issues instead of silently
    // rendering fallback geometry.
    if (!topGeom || !sideGeom) {
      throw new Error('ChunkManager.build: topGeom and sideGeom required');
    }
    const sideGeometry = sideGeom;
    const sideMaterial = new THREE.MeshLambertMaterial({ color: 0xcccccc });
    const sideApi = createInstancedMesh(sideGeometry, sideMaterial, count);
    const sideIM = sideApi.instancedMesh;
    const topGeometry = topGeom;
    const topMaterial = new THREE.MeshLambertMaterial({ color: 0xeeeeee });
    const topApi = createInstancedMesh(topGeometry, topMaterial, count);
    const topIM = topApi.instancedMesh;

  // prepare color arrays for per-instance coloring and per-instance scaling
  const topColorsBiome = new Float32Array(positions.length * 3);
  const sideColorsBiome = new Float32Array(positions.length * 3);
  const topColorsChunk = new Float32Array(positions.length * 3);
  const sideColorsChunk = new Float32Array(positions.length * 3);
  // temporary object removed (no longer storing per-instance matrices)
  for (let i = 0; i < positions.length; i++) {
    const p = positions[i];
    let yScale = 1.0;
    let topCol = new THREE.Color(0xeeeeee);
    let sideCol = new THREE.Color(0xcccccc);
    try {
      if (this.generator) {
        let tile = null;
        if (typeof this.generator.getByXZ === 'function') tile = this.generator.getByXZ(p.worldX, p.worldZ);
        else if (typeof this.generator.get === 'function') tile = this.generator.get(p.q, p.r);
        // Prefer canonical palette supplied on the tile; fallback to biomeFromCell.
        let bio = null;
        if (tile && tile.palette && tile.palette.topColor) {
          bio = { top: tile.palette.topColor, side: tile.palette.sideColor || tile.palette.topColor };
        } else {
          bio = biomeFromCell(tile);
        }
        // Use canonical renderHeight if provided (tile.renderHeight == worldHeight * cfg.scale).
        // If renderHeight is missing, construct it from tile.worldHeight or normalized elevation
        // using centralized DEFAULT_CONFIG values so we remain strict and predictable.
        let elevRender = 0;
        if (tile && typeof tile.renderHeight === 'number') {
          elevRender = tile.renderHeight;
        } else if (tile && typeof tile.worldHeight === 'number') {
          const cfgScale = (DEFAULT_CONFIG && typeof DEFAULT_CONFIG.scale === 'number') ? DEFAULT_CONFIG.scale : 1.0;
          elevRender = tile.worldHeight * cfgScale;
        } else if (tile && tile.elevation && typeof tile.elevation.normalized === 'number') {
          const cfgMaxH = (DEFAULT_CONFIG && typeof DEFAULT_CONFIG.maxHeight === 'number') ? DEFAULT_CONFIG.maxHeight : 1000;
          const cfgScale = (DEFAULT_CONFIG && typeof DEFAULT_CONFIG.scale === 'number') ? DEFAULT_CONFIG.scale : 1.0;
          elevRender = tile.elevation.normalized * cfgMaxH * cfgScale;
        }
        // Apply renderer exaggeration (heightMagnitude) to the computed render height
        yScale = Math.max(0.001, elevRender * (this.heightMagnitude || 1.0));
        // Base colors from palette/biome
        topCol = new THREE.Color(bio && bio.top ? bio.top : 0xeeeeee);
        sideCol = new THREE.Color(bio && bio.side ? bio.side : 0xcccccc);
  // use palette/biome colors (no debug override)
      }
    } catch (e) {
      console.warn('ChunkManager: sampling generator failed', e);
    }
      // Place side centered at world y=0 (height 0.2 -> -0.1..0.1). Place top cap above it.
      // Model-provided geometry expected: sideGeom and topGeom. We assume the
      // loader has normalized X/Z footprint if desired. Compute desired world
      // top and apply pure vertical scaling to the side. Place the cap at the
      // computed top so its bevel is preserved (cap is not scaled vertically).
      try {
  const ms = this.modelScaleFactor || 1.0;
  const desiredTop = yScale; // already computed as elevRender * heightMagnitude in yScale variable
  if (i === 0) {
    try { console.debug('ChunkManager: debug sample', { modelScaleFactor: ms, hexMaxYNative: this.hexMaxYNative, desiredTopSample: desiredTop, layoutRadius: this.layoutRadius }); } catch (ee) { /* ignore */ }
  }
        // Compute vertical scale so sideHeight_native * verticalScale = desiredTop
        const sideHeightNative = this.hexMaxYNative || 1.0;
        let sideVerticalScale = 1.0;
        if (sideHeightNative > 0) sideVerticalScale = Math.max(0.001, desiredTop / sideHeightNative);
        // Side: X/Z scaling assumed baked (ms == 1) or applied uniformly via modelScaleFactor
        sideApi.setInstanceMatrix(i, { x: p.x, y: 0.0, z: p.z }, { x: 0, y: 0, z: 0 }, { x: ms, y: ms * sideVerticalScale, z: ms });
        // Cap: do not scale vertically; place cap at the computed top with small epsilon
        const capY = desiredTop + 0.0005;
        topApi.setInstanceMatrix(i, { x: p.x, y: capY, z: p.z }, { x: 0, y: 0, z: 0 }, { x: ms, y: ms, z: ms });
      } catch (e) {
        console.warn('ChunkManager: instancing model-provided geometry failed', e);
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

  // no debug coloration; use original palette colors

    // attach instanceColor attributes where supported
    // initially use biome colors for instanceColor; store both buffers on neighborhood
    try {
      // Use centralized helper to set instance colors (will reuse arrays when possible)
      setInstanceColors(topIM, topColorsBiome);
      setInstanceColors(sideIM, sideColorsBiome);
    } catch (e) {
      // fallback handled below
    }

    // No overlay mesh: use per-instance coloring/highlighting instead of adding a separate hover model.
    const hoverGroup = null;
    // add instanced meshes to scene (no overlay)
    try {
      if (this.scene) {
        this.scene.add(topIM);
        this.scene.add(sideIM);
        try { topIM.visible = true; sideIM.visible = true; } catch (e) { /* ignore */ }
        try { topIM.frustumCulled = false; sideIM.frustumCulled = false; } catch (e) { /* ignore */ }
  try { console.debug('ChunkManager: added neighborhood to scene', { count, topGeom: !!topGeom, sideGeom: !!sideGeom }); } catch (e) { /* ignore */ }
      }
    } catch (e) {
      console.warn('ChunkManager: add to scene failed', e);
    }

  // chunk border debug helper removed

  // overlay hoverY computation removed (overlay deleted earlier)

  const neighborhood = {
      topIM,
      sideIM,
  // hoverMesh removed; use per-instance color highlighting instead
      count,
      // keep color buffers for toggling
      _topColorsBiome: topColorsBiome,
      _sideColorsBiome: sideColorsBiome,
      _topColorsChunk: topColorsChunk,
      _sideColorsChunk: sideColorsChunk,
  _positions: positions,
      // store highlight state and allow efficient per-instance color updates
      _highlightState: { index: null, prevTop: null, prevSide: null },
      highlightInstance: (index, hexColor = 0xffcc33) => {
        try {
          if (typeof index !== 'number' || index < 0 || index >= count) return;
          const instTop = topIM;
          const instSide = sideIM;
          if (!instTop || !instSide) return;
          let topAttr = instTop.instanceColor;
          let sideAttr = instSide.instanceColor;
          // If instanceColor attributes are not present, try to create them from the cached biome buffers
          if (!topAttr || !sideAttr) {
            try {
              if (neighborhood._topColorsBiome && neighborhood._sideColorsBiome) {
                try { setInstanceColors(instTop, neighborhood._topColorsBiome); } catch (e) { /* ignore */ }
                try { setInstanceColors(instSide, neighborhood._sideColorsBiome); } catch (e) { /* ignore */ }
                topAttr = instTop.instanceColor;
                sideAttr = instSide.instanceColor;
              }
            } catch (e) { /* ignore */ }
          }
          if (!topAttr || !sideAttr) return;
          // If different index is highlighted, clear previous first
          if (neighborhood._highlightState.index !== null && neighborhood._highlightState.index !== index) {
            neighborhood.clearHighlight();
          }
          // save original colors if not saved
          if (neighborhood._highlightState.index === null) {
            neighborhood._highlightState.index = index;
            neighborhood._highlightState.prevTop = [topAttr.array[index * 3 + 0], topAttr.array[index * 3 + 1], topAttr.array[index * 3 + 2]];
            neighborhood._highlightState.prevSide = [sideAttr.array[index * 3 + 0], sideAttr.array[index * 3 + 1], sideAttr.array[index * 3 + 2]];
          }
          const c = new THREE.Color(hexColor);
          topAttr.array[index * 3 + 0] = c.r;
          topAttr.array[index * 3 + 1] = c.g;
          topAttr.array[index * 3 + 2] = c.b;
          sideAttr.array[index * 3 + 0] = c.r;
          sideAttr.array[index * 3 + 1] = c.g;
          sideAttr.array[index * 3 + 2] = c.b;
          topAttr.needsUpdate = true;
          sideAttr.needsUpdate = true;
        } catch (e) { /* ignore */ }
      },
      clearHighlight: () => {
        try {
          const idx = neighborhood._highlightState.index;
          if (idx === null) return;
          const instTop = topIM;
          const instSide = sideIM;
          if (!instTop || !instSide) {
            neighborhood._highlightState.index = null;
            neighborhood._highlightState.prevTop = null;
            neighborhood._highlightState.prevSide = null;
            return;
          }
          const topAttr = instTop.instanceColor;
          const sideAttr = instSide.instanceColor;
          if (!topAttr || !sideAttr) {
            neighborhood._highlightState.index = null;
            neighborhood._highlightState.prevTop = null;
            neighborhood._highlightState.prevSide = null;
            return;
          }
          const prevTop = neighborhood._highlightState.prevTop;
          const prevSide = neighborhood._highlightState.prevSide;
          if (prevTop) {
            topAttr.array[idx * 3 + 0] = prevTop[0];
            topAttr.array[idx * 3 + 1] = prevTop[1];
            topAttr.array[idx * 3 + 2] = prevTop[2];
          }
          if (prevSide) {
            sideAttr.array[idx * 3 + 0] = prevSide[0];
            sideAttr.array[idx * 3 + 1] = prevSide[1];
            sideAttr.array[idx * 3 + 2] = prevSide[2];
          }
          topAttr.needsUpdate = true;
          sideAttr.needsUpdate = true;
          neighborhood._highlightState.index = null;
          neighborhood._highlightState.prevTop = null;
          neighborhood._highlightState.prevSide = null;
        } catch (e) { /* ignore */ }
      },
      dispose: () => {
        try { topIM.geometry && topIM.geometry.dispose && topIM.geometry.dispose(); } catch (e) { console.warn('ChunkManager: dispose top geometry failed', e); }
        try { topIM.material && topIM.material.dispose && topIM.material.dispose(); } catch (e) { console.warn('ChunkManager: dispose top material failed', e); }
        try { sideIM.geometry && sideIM.geometry.dispose && sideIM.geometry.dispose(); } catch (e) { console.warn('ChunkManager: dispose side geometry failed', e); }
        try { sideIM.material && sideIM.material.dispose && sideIM.material.dispose(); } catch (e) { console.warn('ChunkManager: dispose side material failed', e); }
  // no hoverGroup children to dispose; just remove instanced meshes
  try { if (manager && manager.scene) { manager.scene.remove(topIM); manager.scene.remove(sideIM); } } catch (e) { console.warn('ChunkManager: remove from scene failed', e); }
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
  const built = { topIM, sideIM, hoverMesh: hoverGroup, count, neighborhood };

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
