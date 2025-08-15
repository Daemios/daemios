import ChunkNeighborhood from "./ChunkNeighborhood";

export function buildNeighborhood(scene, world, topGeom, sideGeom, opts = {}) {
  // Create the ChunkNeighborhood instance and return it along with the built descriptor.
  const nh = new ChunkNeighborhood({
    scene,
    topGeom,
    sideGeom,
    layoutRadius: opts.layoutRadius,
    spacingFactor: opts.spacingFactor,
    modelScaleFactor: opts.modelScaleFactor,
    contactScale: opts.contactScale,
    sideInset: opts.sideInset,
    chunkCols: opts.chunkCols,
    chunkRows: opts.chunkRows,
    neighborRadius: opts.neighborRadius,
    features: opts.features,
    world,
    heightMagnitude: opts.heightMagnitude,
    pastelColorForChunk: opts.pastelColorForChunk,
    streamBudgetMs: opts.streamBudgetMs,
    streamMaxChunksPerTick: opts.streamMaxChunksPerTick,
    rowsPerSlice: opts.rowsPerSlice,
    onBuildStart: opts.onBuildStart,
    onBuildComplete: opts.onBuildComplete,
  });
  const built = nh.build();
  return { neighborhood: nh, built };
}
