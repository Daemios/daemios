// shared/lib/worldgen/merge.js
// Merge partial outputs from layers into a final Tile object. Simple deterministic merge order.

import { interpretPalette } from './paletteInterpreter.js';

function mergeParts(base, parts, ctx) {
  const tile = Object.assign({}, base);
  // Start with a very low base elevation so subsequent layers add on to it.
  const cfgBase = (ctx && ctx.cfg && typeof ctx.cfg.baseElevation === 'number') ? ctx.cfg.baseElevation : 0.01;
  tile.elevation = { raw: cfgBase, normalized: cfgBase };
  tile.slope = 0;
  tile.palette = { id: 'fallback', topColor: '#000000', sideColor: '#000000', slopeTint: '#000000' };
  tile.biome = { major: 'plains' };
  tile.flags = [];

  // apply palette part
  if (parts.palette && parts.palette.palette) tile.palette = Object.assign({}, tile.palette, parts.palette.palette);
  // Additively apply elevation contributions from all layers. This ensures no
  // single layer overwrites previous elevation — every layer can add to height.
  const elevLayers = ['continents','plates_and_mountains','biomes','clutter','specials','variation'];
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
    // merge other useful fields (bathymetry, slope, plate) from continents if present
    if (ln === 'continents' && part.bathymetry) tile.bathymetry = Object.assign({}, part.bathymetry);
    if (part.slope !== undefined) tile.slope = part.slope;
    if (part.plate) tile.plate = Object.assign({}, part.plate);
  }

  // Preserve the accumulated raw elevation (do NOT clamp here). Some
  // subsequent layers are expected to increase absolute height beyond the
  // initial continents cap. Keep a clamped normalized value for classification
  // and palette decisions, but retain the unclamped raw as the authoritative
  // physical height before visual scaling.
  const rawUnclamped = tile.elevation.raw;
  const normalizedUnclamped = Math.max(0, Math.min(1, rawUnclamped));
  tile.elevation = tile.elevation || {};
  tile.elevation.raw = rawUnclamped;
  // Keep the normalized elevation equal to the unclamped normalized value.
  // The continents layer itself is responsible for applying any local clamping
  // to its own contribution; merge should not re-apply an additional clamp.
  tile.elevation.normalized = normalizedUnclamped;

  // Recompute bathymetry depthBand using the final normalized elevation
  // so that downstream palette logic and clients see authoritative bands
  // after all layers have been merged.
  try {
    if (!tile.bathymetry) tile.bathymetry = {};
    // Require an authoritative seaLevel from the normalized config. normalizeConfig
    // ensures DEFAULT_CONFIG provides a default, so this should always be present
    // for properly normalized cfg objects. Throw if it's missing so callers must
    // provide/normalize config explicitly rather than silently falling back.
    if (!ctx || !ctx.cfg || !ctx.cfg.layers || typeof ctx.cfg.layers.global === 'undefined' || typeof ctx.cfg.layers.global.seaLevel !== 'number') {
      throw new Error('mergeParts: cfg.layers.global.seaLevel is required');
    }
    const seaLevel = ctx.cfg.layers.global.seaLevel;
  // Use the final normalized elevation for bathymetry decisions. Fall back
  // to the previously computed normalizedUnclamped if the field is missing.
  const norm = (tile.elevation && typeof tile.elevation.normalized === 'number') ? tile.elevation.normalized : normalizedUnclamped;
  const isWaterFinal = norm <= seaLevel;
  const depthBand = isWaterFinal ? (norm < seaLevel - 0.12 ? 'deep' : 'shallow') : 'land';
    tile.bathymetry.depthBand = depthBand;
    tile.bathymetry.seaLevel = seaLevel;
  } catch (e) {
    // ignore bathymetry recompute errors
  }

  // After merging the semantic fields, compute the canonical palette using
  // the palette interpreter. The interpreter is responsible for mapping
  // semantic biomes and archetype biases into concrete colors. It may also
  // set flags (for example 'water') on the returned palette; merge will
  // respect those.
  try {
    const computed = interpretPalette(tile, parts, ctx) || {};
    // apply computed palette fields onto tile.palette
    tile.palette = Object.assign({}, tile.palette, computed);
    // if the computed palette indicates water by having a deep ocean anchor
    // we still rely on tile.bathymetry and semantic parts for water flags.
    if (tile.bathymetry && typeof tile.bathymetry.seaLevel === 'number') {
      if (tile.elevation && typeof tile.elevation.normalized === 'number' && tile.elevation.normalized <= tile.bathymetry.seaLevel) {
        tile.flags = tile.flags || [];
        if (!tile.flags.includes('water')) tile.flags.push('water');
      } else {
        tile.flags = (tile.flags || []).filter(f => f !== 'water');
      }
    }
  } catch (e) {
    // if interpreter fails, keep existing palette
  }

  // Expose microvariation (if produced by variation layer) for palette/clients
  try {
    if (parts && parts.variation && typeof parts.variation.microvariation === 'number') {
      tile.microvariation = parts.variation.microvariation;
    }
  } catch (e) { /* ignore */ }

  // Finally, compute canonical world-space height and the renderer's
  // renderHeight using the centralized maxHeight and scale.
  // Contract: worldHeight = normalized * maxHeight
  //           renderHeight = worldHeight * scale
  // Per request: no fallbacks — throw if required values missing so errors surface.
  if (!ctx || !ctx.cfg || typeof ctx.cfg.maxHeight !== 'number') throw new Error('mergeParts: cfg.maxHeight is required');
  if (!ctx || !ctx.cfg || typeof ctx.cfg.scale !== 'number') throw new Error('mergeParts: cfg.scale is required');
  if (!tile.elevation || typeof tile.elevation.normalized !== 'number') throw new Error('mergeParts: tile.elevation.normalized is required');
  const maxH = ctx.cfg.maxHeight;
  const scale = ctx.cfg.scale;
  // world-space height in units (0..maxHeight)
  tile.worldHeight = Math.max(0, tile.elevation.normalized * maxH);
  // final render height after applying visual scale
  tile.renderHeight = tile.worldHeight * scale;
  // Preserve tile.height as the canonical, clamped elevation used for classification
  tile.height = tile.elevation.normalized;

  return tile;
}

export { mergeParts };
