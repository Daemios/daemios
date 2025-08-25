// shared/lib/worldgen/index.js
// Public shared API for deterministic world tile generation.
// Minimal skeleton: calls layer modules and merges partial outputs.

import { DEFAULT_CONFIG } from './config.js';
import { create as createRng } from './rng.js';
import * as noise from './noiseUtils.js';
import { computeTilePart as layer00Compute } from './layers/layer00_palette.js';
import { computeTilePart as layer01Compute, fallback as layer01Fallback } from './layers/layer01_continents.js';
import { computeTilePart as layer02Compute } from './layers/layer02_regions.js';
import { computeTilePart as layer03Compute } from './layers/layer03_biomes.js';
import { computeTilePart as layer03_5Compute } from './layers/layer03_5_clutter.js';
import { computeTilePart as layer04Compute } from './layers/layer04_specials.js';
import { computeTilePart as layer05Compute } from './layers/layer05_visual.js';
import { mergeParts } from './merge.js';

// Local flat-top hex axial->Cartesian helper with fixed layout radius/spacing.
// This mirrors the client-side conversion but avoids importing client code.
function axialToXZLocal(q = 0, r = 0) {
  const hexSize = 2.0; // BASE_HEX_SIZE with layoutRadius=1 and spacingFactor=1
  const x = hexSize * 1.5 * q;
  const z = hexSize * Math.sqrt(3) * (r + q / 2);
  return { x, z };
}

function getDefaultConfig() {
  return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
}

function normalizeConfig(partial) {
  const base = getDefaultConfig();
  const enabled = {};
  for (const k of Object.keys(base.layers)) enabled[k] = true;
  if (partial && partial.layers) {
    for (const k of Object.keys(partial.layers)) {
      const val = partial.layers[k];
      if (typeof val === 'boolean') {
        enabled[k] = val;
      } else if (val && typeof val === 'object') {
        base.layers[k] = Object.assign({}, base.layers[k], val);
        if (typeof val.enabled === 'boolean') enabled[k] = val.enabled;
      }
    }
  }
  if (partial && partial.visual_style) base.visual_style = Object.assign({}, base.visual_style, partial.visual_style);
  base._enabledLayers = enabled;
  return base;
}

function generateTile(seed, coords = {}, cfgPartial) {
  let { q, r, x, z } = coords || {};
  if (typeof x !== 'number' || typeof z !== 'number') {
    ({ x, z } = axialToXZLocal(q, r));
  }
  const cfg = normalizeConfig(cfgPartial);
  const ctx = { seed: String(seed), q, r, x, z, cfg, rng: createRng(seed, x, z), noise };
  const enabled = cfg._enabledLayers || {};

  // run layers in order; parts are partial tile outputs consumed by later layers
  const parts = {};

  // Layer 0: palette defaults
  if (enabled.layer0 !== false) parts.layer0 = layer00Compute(ctx);
  ctx.partials = Object.assign({}, parts);

  // Layer 1: continents (may be expensive)
  if (enabled.layer1 !== false) {
    try {
      parts.layer1 = layer01Compute(ctx);
    } catch (e) {
      parts.layer1 = (typeof layer01Fallback === 'function')
        ? layer01Fallback(ctx)
        : { elevation: { raw: 0, normalized: 0 } };
    }
  } else {
    parts.layer1 = (typeof layer01Fallback === 'function') ? layer01Fallback(ctx) : undefined;
  }
  ctx.partials = Object.assign({}, ctx.partials, { layer1: parts.layer1 });

  // Layer 2: regions
  if (enabled.layer2 !== false && typeof layer02Compute === 'function') parts.layer2 = layer02Compute(ctx);
  ctx.partials.layer2 = parts.layer2;

  // Layer 3: biomes
  if (enabled.layer3 !== false && typeof layer03Compute === 'function') parts.layer3 = layer03Compute(ctx);
  ctx.partials.layer3 = parts.layer3;

  // Layer 3.5: clutter hints
  if (enabled.layer3_5 !== false && typeof layer03_5Compute === 'function') parts.layer3_5 = layer03_5Compute(ctx);
  ctx.partials.layer3_5 = parts.layer3_5;

  // Layer 4: specials
  if (enabled.layer4 !== false && typeof layer04Compute === 'function') parts.layer4 = layer04Compute(ctx);
  ctx.partials.layer4 = parts.layer4;

  // Layer 5: visual adjustments
  if (enabled.layer5 !== false && typeof layer05Compute === 'function') parts.layer5 = layer05Compute(ctx);
  ctx.partials.layer5 = parts.layer5;

  // Merge partials into final tile
  const base = { seed: String(seed) };
  if (typeof q === 'number') base.q = q;
  if (typeof r === 'number') base.r = r;
  const tile = mergeParts(base, parts, ctx);
  // attach deterministic debug provenance
  tile.debug = tile.debug || {};
  // do not include non-deterministic timestamps here; keep debug deterministic
  return tile;
}

export { generateTile, getDefaultConfig, normalizeConfig };
