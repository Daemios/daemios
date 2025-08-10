import * as THREE from 'three';
import { markRaw } from 'vue';
import ChunkNeighborhood from '@/renderer/ChunkNeighborhood';
import ClutterManager from '@/world/ClutterManager';

/**
 * ChunkManager
 * Orchestrates on-screen chunks (instanced hex tiles) and world clutter.
 * Provides a thin, asynchronous control surface for WorldMap.
 */
export default class ChunkManager {
  constructor(opts) {
    // Required
    this.scene = opts.scene;
    this.world = opts.world;

    // Layout / grid
    this.layoutRadius = opts.layoutRadius;
    this.spacingFactor = opts.spacingFactor;
    this.modelScaleFactor = opts.modelScaleFactor;
    this.contactScale = opts.contactScale;
    this.sideInset = opts.sideInset ?? 0.996;
    this.chunkCols = opts.chunkCols;
    this.chunkRows = opts.chunkRows;
    this.neighborRadius = opts.neighborRadius ?? 1;
    this.features = opts.features || {};
  this.heightMagnitude = opts.heightMagnitude != null ? opts.heightMagnitude : 1.0;
    this.centerChunk = { x: opts.centerChunk?.x ?? 0, y: opts.centerChunk?.y ?? 0 };

    // Rendering helpers
    this.pastelColorForChunk = opts.pastelColorForChunk || ((wx, wy) => new THREE.Color(0xffffff));

    // Streaming budgets
    this.streamBudgetMs = opts.streamBudgetMs ?? 6;
  this.streamMaxChunksPerTick = opts.streamMaxChunksPerTick ?? 0; // 0 = unlimited
  this.rowsPerSlice = opts.rowsPerSlice ?? 4;

    // Misc world info for clutter placement
    this.hexMaxY = opts.hexMaxY ?? 1;
  this.modelScaleY = opts.modelScaleY || (() => 1.0);

    // Callbacks to integrate with host (WorldMap)
    this.onBuilt = opts.onBuilt || (() => {});
    this.onPickMeshes = opts.onPickMeshes || (() => {});
    this.onSnapshotTrail = opts.onSnapshotTrail || (() => {});
  this.onExtendTrail = opts.onExtendTrail || (() => {});
  this.onHideTrail = opts.onHideTrail || (() => {});

    // Services
    this.neighborhood = null;
    this.clutter = opts.clutter || markRaw(new ClutterManager({ streamBudgetMs: this.streamBudgetMs }));

    // last neighborhood rect for clutter union under trail
    this._prevNeighborhoodRect = null;
  // Streaming state for neighborhood rebuilds
  this.streaming = false;
  this.trailActive = false;
  }

  async build(topGeom, sideGeom) {
    // Build instanced neighborhood
    if (this.neighborhood) { try { this.neighborhood.dispose(); } catch (e) {} this.neighborhood = null; }
    this.neighborhood = new ChunkNeighborhood({
      scene: this.scene,
      topGeom,
      sideGeom,
      layoutRadius: this.layoutRadius,
      spacingFactor: this.spacingFactor,
      modelScaleFactor: this.modelScaleFactor,
      contactScale: this.contactScale,
      sideInset: this.sideInset,
      chunkCols: this.chunkCols,
      chunkRows: this.chunkRows,
      neighborRadius: this.neighborRadius,
      features: this.features,
      world: this.world,
  heightMagnitude: this.heightMagnitude,
      pastelColorForChunk: (wx, wy) => this.pastelColorForChunk(wx, wy),
      streamBudgetMs: this.streamBudgetMs,
  streamMaxChunksPerTick: this.streamMaxChunksPerTick,
      rowsPerSlice: this.rowsPerSlice,
      onBuildStart: () => {
        this.streaming = true;
      },
      onBuildComplete: () => {
        this.streaming = false;
      },
    });
    const built = this.neighborhood.build();
    // Hand references to host
    this.onBuilt(built);
    this.onPickMeshes([built.topIM, built.sideIM]);

    // Init clutter service
    if (this.clutter) {
      this.clutter.addTo(this.scene);
      this.clutter.prepareFromGrid(this.world);
      try { await this.clutter.loadAssets(); } catch (e) {}
      this.commitClutterForNeighborhood();
    }
  // WorldMap drives the first center set to avoid duplicate invocations here
  }

  dispose() {
    if (this.neighborhood && this.neighborhood.dispose) this.neighborhood.dispose();
    this.neighborhood = null;
    // Leave clutter attached; WorldMap manages its lifecycle toggle separately
  }

  applyChunkColors(enabled) {
    if (this.neighborhood && this.neighborhood.applyChunkColors) this.neighborhood.applyChunkColors(!!enabled);
  }

  setCenterChunk(wx, wy, options = {}) {
    if (!this.neighborhood) return;
    // Skip if center didn't change and we already have slot assignments populated
    if (wx === this.centerChunk.x && wy === this.centerChunk.y) {
      const assigned = !!(this.neighborhood && this.neighborhood._chunkToSlot && this.neighborhood._chunkToSlot.size > 0);
      if (assigned) return;
    }
    // Trail snapshot (host decides how to draw/hide)
    const trailMs = options.trailMs != null ? options.trailMs : 3000;
    // If a trail is already active from the previous move, don't resnapshot; just extend it
    if (this.trailActive) {
      try { this.onExtendTrail(trailMs); } catch (e) {}
    } else {
      try { this.onSnapshotTrail(trailMs); } catch (e) {}
      this.trailActive = true;
    }
    // Store rect for clutter union under the trail
  const r = this.neighborRadius;
    const newPrev = {
      colMin: (this.centerChunk.x - r) * this.chunkCols,
      rowMin: (this.centerChunk.y - r) * this.chunkRows,
      colMax: (this.centerChunk.x + r) * this.chunkCols + (this.chunkCols - 1),
      rowMax: (this.centerChunk.y + r) * this.chunkRows + (this.chunkRows - 1),
    };
    if (this.trailActive && this._prevNeighborhoodRect) {
      this._prevNeighborhoodRect = {
        colMin: Math.min(this._prevNeighborhoodRect.colMin, newPrev.colMin),
        rowMin: Math.min(this._prevNeighborhoodRect.rowMin, newPrev.rowMin),
        colMax: Math.max(this._prevNeighborhoodRect.colMax, newPrev.colMax),
        rowMax: Math.max(this._prevNeighborhoodRect.rowMax, newPrev.rowMax),
      };
    } else {
      this._prevNeighborhoodRect = newPrev;
    }
    // Update center
  const prevX = this.centerChunk.x; const prevY = this.centerChunk.y;
  this.centerChunk.x = wx; this.centerChunk.y = wy;
  const bias = { x: Math.sign(wx - prevX), y: Math.sign(wy - prevY) };
    // Stream neighborhood fill
  this.neighborhood.setCenterChunk(wx, wy, { bias });
    // Debounced clutter rebuild (lighter delay when small radius)
    const delay = (this.neighborRadius && this.neighborRadius > 1) ? 120 : 60;
    clearTimeout(this._clutterTimer); this._clutterTimer = setTimeout(() => this.commitClutterForNeighborhood(), delay);
  }

  commitClutterForNeighborhood() {
    if (!this.clutter || !this.world) return;
    const radius = this.neighborRadius ?? 1;
    const curr = {
      colMin: (this.centerChunk.x - radius) * this.chunkCols,
      rowMin: (this.centerChunk.y - radius) * this.chunkRows,
      colMax: (this.centerChunk.x + radius) * this.chunkCols + (this.chunkCols - 1),
      rowMax: (this.centerChunk.y + radius) * this.chunkRows + (this.chunkRows - 1),
    };
  // Unify behavior: if the trail is active, union with the previous neighborhood regardless of radius
  const shouldUnion = !!this._prevNeighborhoodRect && !!this.trailActive;
    const rect = shouldUnion
      ? {
          colMin: Math.min(curr.colMin, this._prevNeighborhoodRect.colMin),
          rowMin: Math.min(curr.rowMin, this._prevNeighborhoodRect.rowMin),
          colMax: Math.max(curr.colMax, this._prevNeighborhoodRect.colMax),
          rowMax: Math.max(curr.rowMax, this._prevNeighborhoodRect.rowMax),
        }
  : curr;
    const layoutRadius = this.layoutRadius;
    const contactScale = this.contactScale;
    const hexMaxY = this.hexMaxY;
  const modelScaleY = (q, r) => (this.modelScaleY ? this.modelScaleY(q, r) : 1.0);
    // Commit asynchronously (ClutterManager streams internally)
  this.clutter.commitInstances({ layoutRadius, contactScale, hexMaxY, modelScaleY, filter: undefined, offsetRect: rect });
  }
}
