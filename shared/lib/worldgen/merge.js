// shared/lib/worldgen/merge.js
// Merge partial outputs from layers into a final Tile object. Simple deterministic merge order.

function mergeParts(base, parts, ctx) {
  const tile = Object.assign({}, base);
  tile.elevation = { raw: 0, normalized: 0 };
  tile.slope = 0;
  tile.palette = { id: 'fallback', topColor: '#000000', sideColor: '#000000', slopeTint: '#000000' };
  tile.biome = { major: 'plains' };
  tile.flags = [];

  // apply layer0 (palette + defaults)
  if (parts.layer0 && parts.layer0.palette) tile.palette = Object.assign({}, tile.palette, parts.layer0.palette);

  // apply explicit base minimum if present (canvas baseline)
  if (parts.base && parts.base.elevation) {
    const baseAdd = typeof parts.base.elevation.add === 'number' ? parts.base.elevation.add : (typeof parts.base.elevation.raw === 'number' ? parts.base.elevation.raw : 0);
    tile.elevation.raw = (tile.elevation.raw || 0) + baseAdd;
  }

  // Layer1 is treated as the base seabed/continental baseline. Use it as the
  // minimum elevation onto which later layers will 'paint'. Preserve bathymetry
  // and slope coming from layer1.
  if (parts.layer1) {
    if (parts.layer1.elevation) {
      // if layer1 produced an additive contribution, accumulate it; otherwise
      // fall back to using raw value but keep previous base additions.
      const add1 = typeof parts.layer1.elevation.add === 'number' ? parts.layer1.elevation.add : (typeof parts.layer1.elevation.raw === 'number' ? parts.layer1.elevation.raw : 0);
      tile.elevation.raw = (tile.elevation.raw || 0) + add1;
      // keep legacy raw/normalized values for consumers where present
      if (typeof parts.layer1.elevation.raw === 'number') tile.elevation.raw = parts.layer1.elevation.raw + (tile.elevation.raw - add1);
      if (typeof parts.layer1.elevation.normalized === 'number') tile.elevation.normalized = parts.layer1.elevation.normalized;
    }
    if (parts.layer1.bathymetry) tile.bathymetry = Object.assign({}, parts.layer1.bathymetry);
    if (parts.layer1.slope !== undefined) tile.slope = parts.layer1.slope;
    if (parts.layer1.plate) tile.plate = Object.assign({}, parts.layer1.plate);
  }

  // Subsequent layers should 'paint' onto the baseline rather than fully
  // replace it. We'll treat any elevation value produced by later layers as
  // an additive contribution unless the layer explicitly intends to replace
  // (not currently used). This keeps compatibility while enabling a stacked
  // noise pipeline.
  const laterLayerKeys = ['layer2', 'layer3', 'layer3_5', 'layer4', 'layer5'];
  for (const k of laterLayerKeys) {
    const part = parts[k];
    if (!part || !part.elevation) continue;
    // If the layer provided an explicit 'add' field, use that. Otherwise
    // interpret the elevation.raw as an additive height paint.
    const add = typeof part.elevation.add === 'number' ? part.elevation.add : (typeof part.elevation.raw === 'number' ? part.elevation.raw : 0);
    tile.elevation.raw = (tile.elevation.raw || 0) + add;
    // carry through any slope/bathymetry hints the layer may provide
    if (part.bathymetry) tile.bathymetry = Object.assign({}, tile.bathymetry || {}, part.bathymetry);
    if (part.slope !== undefined) tile.slope = part.slope;
  }

  // Keep a conservative 'normalized' field mirroring raw for now. Higher-level
  // normalization or remapping can happen elsewhere when needed.
  tile.elevation.normalized = tile.elevation.raw;

  return tile;
}

export { mergeParts };
