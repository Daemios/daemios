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

function getDefaultConfig() {
  return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
}

function normalizeConfig(partial) {
  const base = getDefaultConfig();
  if (!partial) return base;
  // shallow merge for layers.enabled and top-level visual_style
  if (partial.layers && partial.layers.enabled) {
    base.layers.enabled = Object.assign({}, base.layers.enabled, partial.layers.enabled);
  }
  // merge per-layer tunables if provided
  for (const k of Object.keys(base.layers)) {
    if (partial.layers && partial.layers[k]) base.layers[k] = Object.assign({}, base.layers[k], partial.layers[k]);
  }
  if (partial.visual_style) base.visual_style = Object.assign({}, base.visual_style, partial.visual_style);
  return base;
}

function generateTile(seed, q, r, cfgPartial) {
  const cfg = normalizeConfig(cfgPartial);
  const ctx = { seed: String(seed), q, r, cfg, rng: createRng(seed, q, r), noise };

  // run layers in order; parts are partial tile outputs consumed by later layers
  const parts = {};

  // Layer 0: palette defaults
  if (cfg.layers.enabled.layer0) parts.layer0 = layer00Compute(ctx);
  else parts.layer0 = { palette: { id: 'fallback', topColor: '#000000', sideColor: '#000000', slopeTint: '#000000' } };
  ctx.partials = Object.assign({}, parts);

  // Layer 1: continents (may be expensive)
  if (cfg.layers.enabled.layer1) parts.layer1 = layer01Compute(ctx);
  else parts.layer1 = layer01Fallback(ctx);
  ctx.partials = Object.assign({}, ctx.partials, { layer1: parts.layer1 });

  // Layer 2: regions
  if (cfg.layers.enabled.layer2) parts.layer2 = layer02Compute(ctx);
  ctx.partials.layer2 = parts.layer2;

  // Layer 3: biomes
  if (cfg.layers.enabled.layer3) parts.layer3 = layer03Compute(ctx);
  ctx.partials.layer3 = parts.layer3;

  // Layer 3.5: clutter hints
  if (cfg.layers.enabled.layer3_5) parts.layer3_5 = layer03_5Compute(ctx);
  ctx.partials.layer3_5 = parts.layer3_5;

  // Layer 4: specials
  if (cfg.layers.enabled.layer4) parts.layer4 = layer04Compute(ctx);
  ctx.partials.layer4 = parts.layer4;

  // Layer 5: visual adjustments
  if (cfg.layers.enabled.layer5) parts.layer5 = layer05Compute(ctx);
  ctx.partials.layer5 = parts.layer5;

  // Merge partials into final tile
  const tile = mergeParts({ q, r, seed: String(seed) }, parts, ctx);
  // attach deterministic debug provenance
  tile.debug = tile.debug || {};
  // do not include non-deterministic timestamps here; keep debug deterministic
  return tile;
}

export { generateTile, getDefaultConfig, normalizeConfig };
