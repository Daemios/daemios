// shared/lib/worldgen/merge.js
// Merge partial outputs from layers into a final Tile object. Simple deterministic merge order.

function mergeParts(base, parts, ctx) {
  const tile = Object.assign({}, base);
  // Start with a very low base elevation so subsequent layers add on to it.
  const cfgBase = (ctx && ctx.cfg && typeof ctx.cfg.baseElevation === 'number') ? ctx.cfg.baseElevation : 0.01;
  tile.elevation = { raw: cfgBase, normalized: cfgBase };
  tile.slope = 0;
  tile.palette = { id: 'fallback', topColor: '#000000', sideColor: '#000000', slopeTint: '#000000' };
  tile.biome = { major: 'plains' };
  tile.flags = [];

  // apply layer0
  if (parts.layer0 && parts.layer0.palette) tile.palette = Object.assign({}, tile.palette, parts.layer0.palette);
  // Additively apply elevation contributions from all layers. This ensures no
  // single layer overwrites previous elevation — every layer can add to height.
  const elevLayers = ['layer1','layer2','layer3','layer3_5','layer4','layer5'];
  for (const ln of elevLayers) {
    const part = parts[ln];
    if (!part) continue;
    if (part.elevation) {
      const e = part.elevation;
      const val = typeof e.raw === 'number' ? e.raw : (typeof e.normalized === 'number' ? e.normalized : null);
      if (val != null && !Number.isNaN(val)) {
        tile.elevation.raw += val;
      }
    }
    // merge other useful fields (bathymetry, slope, plate) from layer1 if present
    if (ln === 'layer1' && part.bathymetry) tile.bathymetry = Object.assign({}, part.bathymetry);
    if (part.slope !== undefined) tile.slope = part.slope;
    if (part.plate) tile.plate = Object.assign({}, part.plate);
  }

  // Clamp and normalize final elevation to 0..1
  tile.elevation.raw = Math.max(0, Math.min(1, tile.elevation.raw));
  tile.elevation.normalized = tile.elevation.raw;

  // Ensure a tile.height that scales directly with elevation (normalized 0..1)
  tile.height = tile.elevation.normalized;

  // After merging, compute a minimal, deterministic palette based on elevation
  // so the initial world is colored by height only. Anything under seaLevel
  // is treated as water and receives a gradient from deep blue (low) to sand (near sea).
  try {
    const seaLevel = (tile.bathymetry && typeof tile.bathymetry.seaLevel === 'number') ? tile.bathymetry.seaLevel : 0.52;
    const elev = (tile.elevation && typeof tile.elevation.normalized === 'number') ? tile.elevation.normalized : 0;

    // helper: lerp between two hex colors by t in [0,1]
    const hexToRgb = (hex) => {
      const h = hex.replace('#','');
      const r = parseInt(h.substring(0,2),16);
      const g = parseInt(h.substring(2,4),16);
      const b = parseInt(h.substring(4,6),16);
      return { r, g, b };
    };
    const rgbToHex = (c) => '#' + [c.r,c.g,c.b].map(v => Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');
    const lerpColor = (a, b, t) => ({ r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t });

    // Define sand and deep blue anchors
    const sandHex = '#e3d3b8'; // sandy tan near shore
    const deepHex = '#013a6b'; // deep ocean blue
    const sand = hexToRgb(sandHex);
    const deep = hexToRgb(deepHex);

    if (elev <= seaLevel) {
      const t = seaLevel <= 0 ? 0 : (elev / seaLevel);
      // at t=0 -> deep, t=1 -> sand
      const c = lerpColor(deep, sand, t);
      tile.palette.topColor = rgbToHex(c);
      // side color: slightly darker
      const side = { r: c.r * 0.7, g: c.g * 0.75, b: c.b * 0.8 };
      tile.palette.sideColor = rgbToHex(side);
      tile.flags = tile.flags || [];
      if (!tile.flags.includes('water')) tile.flags.push('water');
    } else {
      // Land: keep palette from layer0 if present, otherwise use sand for now
      if (!tile.palette || !tile.palette.topColor || tile.palette.topColor === '#000000') {
        tile.palette.topColor = sandHex;
        tile.palette.sideColor = '#cbb89d';
      }
      // ensure water flag not present
      tile.flags = (tile.flags || []).filter(f => f !== 'water');
    }
  } catch (e) {
    // if color computation fails, leave palette as-is
  }

  return tile;
}

export { mergeParts };
