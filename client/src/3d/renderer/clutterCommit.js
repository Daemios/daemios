export function computeNeighborhoodRect(
  centerChunk,
  chunkCols,
  chunkRows,
  radius
) {
  const r = radius ?? 1;
  return {
    colMin: (centerChunk.x - r) * chunkCols,
    rowMin: (centerChunk.y - r) * chunkRows,
    colMax: (centerChunk.x + r) * chunkCols + (chunkCols - 1),
    rowMax: (centerChunk.y + r) * chunkRows + (chunkRows - 1),
  };
}

export function unionRects(a, b) {
  if (!a) return b;
  if (!b) return a;
  return {
    colMin: Math.min(a.colMin, b.colMin),
    rowMin: Math.min(a.rowMin, b.rowMin),
    colMax: Math.max(a.colMax, b.colMax),
    rowMax: Math.max(a.rowMax, b.rowMax),
  };
}

export function commitClutter(clutter, world, opts = {}) {
  if (!clutter || !world) return;
  const {
    centerChunk,
    chunkCols,
    chunkRows,
    radius,
    prevRect,
    layoutRadius,
    contactScale,
    hexMaxY,
    modelScaleY,
  } = opts;
  const curr = computeNeighborhoodRect(
    centerChunk,
    chunkCols,
    chunkRows,
    radius
  );
  const shouldUnion = radius === 1 && !!prevRect && !!opts.trailActive;
  const rect = shouldUnion ? unionRects(curr, prevRect) : curr;
  const mScaleY = (q, r) => (modelScaleY ? modelScaleY(q, r) : 1.0);
  clutter.commitInstances({
    layoutRadius,
    contactScale,
    hexMaxY,
    modelScaleY: mScaleY,
    filter: undefined,
    offsetRect: rect,
  });
}
