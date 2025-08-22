// shared/lib/worldgen/merge.js
// Merge partial outputs from layers into a final Tile object. Simple deterministic merge order.

function mergeParts(base, parts, ctx) {
  const tile = Object.assign({}, base);
  tile.elevation = { raw: 0, normalized: 0 };
  tile.slope = 0;
  tile.palette = { id: 'fallback', topColor: '#000000', sideColor: '#000000', slopeTint: '#000000' };
  tile.biome = { major: 'plains' };
  tile.flags = [];

  // apply layer0
  if (parts.layer0 && parts.layer0.palette) tile.palette = Object.assign({}, tile.palette, parts.layer0.palette);
  // apply layer1
  if (parts.layer1) {
    if (parts.layer1.elevation) tile.elevation = Object.assign({}, tile.elevation, parts.layer1.elevation);
    if (parts.layer1.bathymetry) tile.bathymetry = Object.assign({}, parts.layer1.bathymetry);
    if (parts.layer1.slope !== undefined) tile.slope = parts.layer1.slope;
    if (parts.layer1.plate) tile.plate = Object.assign({}, parts.layer1.plate);
  }

  // later layers would override/add fields

  return tile;
}

export { mergeParts };
