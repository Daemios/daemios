/* eslint-disable no-param-reassign */
export function snapshotTrail(ctx, delayMs = 3000) {
  if (!ctx || !ctx.topIM || !ctx.sideIM || !ctx.trailTopIM || !ctx.trailSideIM)
    return;
  // Cancel any in-progress trail copy job
  if (ctx._trailCopy && ctx._trailCopy.cancel) {
    try {
      ctx._trailCopy.cancel();
    } catch (e) {
      console.debug("trail copy cancel failed", e);
    }
    ctx._trailCopy = null;
  }
  // Capture current neighborhood rect so clutter can persist under the trail
  if (ctx._neighborRadius != null && ctx.centerChunk) {
    const r = ctx._neighborRadius;
    ctx._prevNeighborhoodRect = {
      colMin: (ctx.centerChunk.x - r) * ctx.chunkCols,
      rowMin: (ctx.centerChunk.y - r) * ctx.chunkRows,
      colMax: (ctx.centerChunk.x + r) * ctx.chunkCols + (ctx.chunkCols - 1),
      rowMax: (ctx.centerChunk.y + r) * ctx.chunkRows + (ctx.chunkRows - 1),
    };
  }
  const count = ctx.topIM.count | 0;
  ctx.trailTopIM.count = count;
  ctx.trailSideIM.count = count;
  ctx.trailTopIM.visible = true;
  ctx.trailSideIM.visible = true;
  try {
    ctx.trailTopIM.instanceMatrix.array.set(
      ctx.topIM.instanceMatrix.array.subarray(0, count * 16),
      0
    );
    ctx.trailSideIM.instanceMatrix.array.set(
      ctx.sideIM.instanceMatrix.array.subarray(0, count * 16),
      0
    );
    ctx.trailTopIM.instanceMatrix.needsUpdate = true;
    ctx.trailSideIM.instanceMatrix.needsUpdate = true;
    if (ctx.topIM.instanceColor && ctx.trailTopIM.instanceColor) {
      ctx.trailTopIM.instanceColor.array.set(
        ctx.topIM.instanceColor.array.subarray(0, count * 3),
        0
      );
      ctx.trailTopIM.instanceColor.needsUpdate = true;
    }
    if (ctx.sideIM.instanceColor && ctx.trailSideIM.instanceColor) {
      ctx.trailSideIM.instanceColor.array.set(
        ctx.sideIM.instanceColor.array.subarray(0, count * 3),
        0
      );
      ctx.trailSideIM.instanceColor.needsUpdate = true;
    }
  } catch (e) {
    console.debug("trail snapshot matrix copy failed", e);
  }
  if (ctx.trailTimer) {
    clearTimeout(ctx.trailTimer);
    ctx.trailTimer = null;
  }
  ctx.trailTimer = setTimeout(() => {
    ctx.trailTimer = null;
    ctx.trailTopIM.visible = false;
    ctx.trailSideIM.visible = false;
    ctx._prevNeighborhoodRect = null;
    if (ctx.chunkManager) {
      ctx.chunkManager.trailActive = false;
      if (typeof ctx.chunkManager._prevNeighborhoodRect !== "undefined")
        ctx.chunkManager._prevNeighborhoodRect = null;
      if (ctx.chunkManager.commitClutterForNeighborhood)
        ctx.chunkManager.commitClutterForNeighborhood();
    }
    if (ctx._trailCopy && ctx._trailCopy.cancel) {
      try {
        ctx._trailCopy.cancel();
      } catch (e) {
        console.debug("trail copy cancel failed", e);
      }
      ctx._trailCopy = null;
    }
  }, Math.max(0, delayMs | 0));
}

export function extendTrail(ctx, delayMs = 3000) {
  if (!ctx.trailTopIM || !ctx.trailSideIM) return;
  ctx.trailTopIM.visible = true;
  ctx.trailSideIM.visible = true;
  if (ctx.trailTimer) {
    clearTimeout(ctx.trailTimer);
    ctx.trailTimer = null;
  }
  ctx.trailTimer = setTimeout(() => {
    ctx.trailTimer = null;
    ctx.trailTopIM.visible = false;
    ctx.trailSideIM.visible = false;
    ctx._prevNeighborhoodRect = null;
    if (ctx.chunkManager) {
      ctx.chunkManager.trailActive = false;
      if (typeof ctx.chunkManager._prevNeighborhoodRect !== "undefined")
        ctx.chunkManager._prevNeighborhoodRect = null;
      if (ctx.chunkManager.commitClutterForNeighborhood)
        ctx.chunkManager.commitClutterForNeighborhood();
    }
  }, Math.max(0, delayMs | 0));
}
