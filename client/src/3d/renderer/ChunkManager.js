import * as THREE from "three";
import { markRaw } from "vue";
import { buildNeighborhood } from "./neighborhoodBuilder";
import ClutterManager from "../world/ClutterManager";
import { createHoverMesh } from "./hoverMesh";
import { commitClutter } from "./clutterCommit";
import { initClutter } from "./clutterInit";
import { handleSetCenterChunk } from "./centerController";

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
    this.heightMagnitude =
      opts.heightMagnitude != null ? opts.heightMagnitude : 1.0;
    this.centerChunk = {
      x: opts.centerChunk?.x ?? 0,
      y: opts.centerChunk?.y ?? 0,
    };

    // Rendering helpers
    this.pastelColorForChunk =
      opts.pastelColorForChunk || (() => new THREE.Color(0xffffff));

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
    this.clutter =
      opts.clutter ||
      markRaw(new ClutterManager({ streamBudgetMs: this.streamBudgetMs }));

    // last neighborhood rect for clutter union under trail
    this._prevNeighborhoodRect = null;
    // Streaming state for neighborhood rebuilds
    this.streaming = false;
    this.trailActive = false;
  }

  async build(topGeom, sideGeom) {
    // remember last geoms so the manager can rebuild itself during progressive expansion
    this._lastTopGeom = topGeom;
    this._lastSideGeom = sideGeom;
    // Build instanced neighborhood
    if (this.neighborhood) {
      try {
        this.neighborhood.dispose();
      } catch (e) {
        console.debug("neighborhood.dispose failed", e);
      }
      this.neighborhood = null;
    }
    const res = buildNeighborhood(this.scene, this.world, topGeom, sideGeom, {
      layoutRadius: this.layoutRadius,
      spacingFactor: this.spacingFactor,
      modelScaleFactor: this.modelScaleFactor,
      contactScale: this.contactScale,
      sideInset: this.sideInset,
      chunkCols: this.chunkCols,
      chunkRows: this.chunkRows,
      neighborRadius: this.neighborRadius,
      features: this.features,
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
    this.neighborhood = res.neighborhood;
    const built = res.built;
    // Create a single hover overlay mesh to avoid relying on instance colors
    try {
      const hoverMesh = createHoverMesh(this.scene, topGeom);
      if (hoverMesh) built.hoverMesh = hoverMesh;
    } catch (e) {
      console.debug("createHoverMesh failed", e);
    }

    // Hand references to host
    this.onBuilt(built);
    // Built object already includes topIM/sideIM; inform host which meshes are pick targets
    this.onPickMeshes([built.topIM, built.sideIM]);

    // Init clutter service
    if (this.clutter) {
      await initClutter(this.clutter, this.scene, this.world);
      this.commitClutterForNeighborhood();
    }
    // WorldMap drives the first center set to avoid duplicate invocations here
  }

  // Schedule a progressive expansion to `targetRadius` once current streaming finishes.
  // Accepts an optional callbacks object: { onComplete }
  scheduleProgressiveExpand(targetRadius, callbacks = {}) {
    try {
      if (this._progressiveCheckId)
        cancelAnimationFrame(this._progressiveCheckId);
    } catch (e) {
      console.debug("cancelProgressiveExpand failed", e);
    }
    const self = this;
    const check = () => {
      // Wait until current build/streaming completes
      if (!self.streaming) {
        // Only expand if targetRadius is larger than current
        if ((self.neighborRadius || 1) < targetRadius) {
          self.neighborRadius = targetRadius;
          // Rebuild using the last provided geometries
          try {
            self
              .build(self._lastTopGeom, self._lastSideGeom)
              .then(() => {
                if (callbacks && typeof callbacks.onComplete === "function") {
                  try {
                    callbacks.onComplete();
                  } catch (e) {
                    console.debug("onComplete failed", e);
                  }
                }
              })
              .catch((err) => {
                console.debug("progressive build failed", err);
              });
          } catch (err) {
            console.debug("scheduleProgressiveExpand build failed", err);
          }
        }
        self._progressiveCheckId = null;
      } else {
        self._progressiveCheckId = requestAnimationFrame(check);
      }
    };
    try {
      this._progressiveCheckId = requestAnimationFrame(check);
    } catch (e) {
      // requestAnimationFrame may not exist in some environments
      console.debug(
        "requestAnimationFrame missing, falling back to setTimeout",
        e
      );
      setTimeout(check, 16);
    }
  }

  cancelProgressiveExpand() {
    try {
      if (this._progressiveCheckId)
        cancelAnimationFrame(this._progressiveCheckId);
    } catch (e) {
      console.debug("cancelProgressiveExpand failed", e);
    }
    this._progressiveCheckId = null;
  }

  // Start a progressive expansion sequence; marks progressive mode active during expansion
  startProgressive(targetRadius) {
    this._progressiveTarget = targetRadius;
    this.scheduleProgressiveExpand(targetRadius, {
      onComplete: () => {
        this._progressiveTarget = null;
      },
    });
  }

  stopProgressive() {
    this._progressiveTarget = null;
    this.cancelProgressiveExpand();
  }

  dispose() {
    if (this.neighborhood && this.neighborhood.dispose)
      this.neighborhood.dispose();
    this.neighborhood = null;
    // Leave clutter attached; WorldMap manages its lifecycle toggle separately
  }

  applyChunkColors(enabled) {
    if (this.neighborhood && this.neighborhood.applyChunkColors)
      this.neighborhood.applyChunkColors(!!enabled);
  }

  setCenterChunk(wx, wy, options = {}) {
    handleSetCenterChunk(this, wx, wy, options);
  }

  commitClutterForNeighborhood() {
    if (!this.clutter || !this.world) return;
    const radius = this.neighborRadius ?? 1;
    // Commit asynchronously (ClutterManager streams internally)
    commitClutter(this.clutter, this.world, {
      centerChunk: this.centerChunk,
      chunkCols: this.chunkCols,
      chunkRows: this.chunkRows,
      radius,
      prevRect: this._prevNeighborhoodRect,
      layoutRadius: this.layoutRadius,
      contactScale: this.contactScale,
      hexMaxY: this.hexMaxY,
      modelScaleY: this.modelScaleY,
      trailActive: this.trailActive,
    });
  }

  // Debounced clutter commit to avoid spamming during UI drags
  scheduleClutterCommit(delayMs = 120) {
    try {
      if (this._clutterCommitTimer) {
        clearTimeout(this._clutterCommitTimer);
        this._clutterCommitTimer = null;
      }
    } catch (e) {
      console.debug("clear _clutterCommitTimer failed", e);
    }
    this._clutterCommitTimer = setTimeout(() => {
      this._clutterCommitTimer = null;
      this.commitClutterForNeighborhood();
    }, Math.max(0, delayMs | 0));
  }

  clearClutterCommit() {
    try {
      if (this._clutterCommitTimer) {
        clearTimeout(this._clutterCommitTimer);
        this._clutterCommitTimer = null;
      }
    } catch (e) {
      console.debug("clearClutterCommit failed", e);
    }
  }
}

// Factory for external callers
export function createChunkManager(opts) {
  return new ChunkManager(opts);
}
