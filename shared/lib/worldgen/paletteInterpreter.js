// shared/lib/worldgen/paletteInterpreter.js
// Compute a canonical palette from semantic layer outputs (layer0 defaults,
// layer3 biome attributes, layer2 modifiers, and layer5 visual hints).

// This module exposes a single function `interpretPalette(tile, parts, ctx)`
// which returns a palette object { id, topColor, sideColor, slopeTint }.

import { lerpHex } from './utils/colorHelpers.js';

function smoothstep(t) { return t * t * (3 - 2 * t); }

function defaultInterpreter(tile, parts, ctx) {
  const base = (parts.layer0 && parts.layer0.palette) ? Object.assign({}, parts.layer0.palette) : { id: 'default', topColor: '#8ccf72', sideColor: '#6aa24f', slopeTint: '#7fbf60' };

  const biome = parts.layer3 && parts.layer3.biome ? parts.layer3.biome : null;
  let top = base.topColor;
  let side = base.sideColor;
  let slopeTint = base.slopeTint || base.sideColor;

  const ANCHORS = {
    ocean: { top: '#013a6b', side: '#01324e' },
    beach: { top: '#e3d3b8', side: '#cbb89d' },
    plains: { top: '#8ccf72', side: '#6aa24f' },
    forest: { top: '#4f8a4f', side: '#356a35' },
    hill: { top: '#bca06b', side: '#96794f' },
    mountain: { top: '#9b9b9b', side: '#777777' },
    snow: { top: '#f3f7fb', side: '#dfe7ee' }
  };

  // Determine sea level (tile.bathymetry preferred, then cfg, then default)
  const seaLevel = (tile.bathymetry && typeof tile.bathymetry.seaLevel === 'number')
    ? tile.bathymetry.seaLevel
    : (ctx && ctx.cfg && ctx.cfg.layers && ctx.cfg.layers.global && typeof ctx.cfg.layers.global.seaLevel === 'number')
      ? ctx.cfg.layers.global.seaLevel
      : 0.52;
  const elevNorm = (tile.elevation && typeof tile.elevation.normalized === 'number') ? tile.elevation.normalized : 0;

  // Prefer explicit bathymetry depthBand when present (more authoritative)
  const depthBand = (tile.bathymetry && tile.bathymetry.depthBand) ? tile.bathymetry.depthBand : null;
  const isWater = (depthBand === 'deep' || depthBand === 'shallow') || elevNorm <= seaLevel;

  // If this tile is water, return a water gradient and do not apply land nudges.
  if (isWater) {
    const deepHex = '#013a6b';
    const sandHex = '#e3d3b8';
    const t = seaLevel <= 0 ? 0 : Math.max(0, Math.min(1, elevNorm / seaLevel));
    const cTop = lerpHex(deepHex, sandHex, t);
    const sideAnchor = lerpHex('#013a6b', '#cbb89d', Math.min(1, t * 0.8));
    slopeTint = lerpHex(cTop, '#ffffff', 0.12);
    return Object.assign({ id: base.id || 'computed' }, { topColor: cTop, sideColor: sideAnchor, slopeTint });
  }

  // Land path: blend major/secondary anchors smoothly
  if (biome) {
    const majorAnchor = ANCHORS[biome.major] || ANCHORS.plains;
    // Prevent water anchors from being used as secondary for land tiles.
    let secondaryAnchor = ANCHORS[biome.secondary] || majorAnchor;
    const waterAnchors = new Set(['ocean','beach']);
    if (waterAnchors.has(biome.secondary) && !waterAnchors.has(biome.major)) {
      // if the major is land but the chosen secondary is water, replace with plains to avoid blue tint
      secondaryAnchor = ANCHORS.plains;
    }
    // biome.blend was computed in range 0..0.5; normalize to 0..1 then smooth
    const rawBlend = Math.max(0, Math.min(1, (biome.blend || 0) * 2));
    const blendFactor = smoothstep(rawBlend);
    top = lerpHex(majorAnchor.top, secondaryAnchor.top, blendFactor);
    side = lerpHex(majorAnchor.side, secondaryAnchor.side, blendFactor);
  }

  // apply much smaller modifiers from layer2 archetypeBias if present, only on land
  if (parts.layer2 && parts.layer2.archetypeBias && typeof parts.layer2.archetypeBias.elevation === 'number') {
    const bias = parts.layer2.archetypeBias.elevation;
    // allow only small nudges toward sand for positive elevation bias on land
    if (bias > 0.02) {
      top = lerpHex(top, '#e3d3b8', Math.min(0.06, bias * 0.15));
    }
    // do NOT nudge toward blue on land; negative biases should not inject ocean hues
  }

  slopeTint = lerpHex(side, '#ffffff', 0.15);
  return Object.assign({ id: base.id || 'computed' }, { topColor: top, sideColor: side, slopeTint });
}

function interpretPalette(tile, parts, ctx) {
  try {
    return defaultInterpreter(tile, parts, ctx);
  } catch (e) {
    // on error, fallback to a safe palette
    return { id: 'fallback', topColor: '#8ccf72', sideColor: '#6aa24f', slopeTint: '#7fbf60' };
  }
}

export { interpretPalette };
