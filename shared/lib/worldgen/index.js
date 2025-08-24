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
  // merge per-layer tunables if provided
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
  parts.layer0 = layer00Compute(ctx);
  ctx.partials = Object.assign({}, parts);

  // Layer 1: continents (may be expensive)
  try {
    parts.layer1 = layer01Compute(ctx);
  } catch (e) {
    // fallback when compute fails or is unavailable
    parts.layer1 = (typeof layer01Fallback === 'function') ? layer01Fallback(ctx) : { elevation: { raw: 0, normalized: 0 } };
  }
  ctx.partials = Object.assign({}, ctx.partials, { layer1: parts.layer1 });

  // Layer 2: regions
  parts.layer2 = (typeof layer02Compute === 'function') ? layer02Compute(ctx) : undefined;
  ctx.partials.layer2 = parts.layer2;

  // Layer 3: biomes
  parts.layer3 = (typeof layer03Compute === 'function') ? layer03Compute(ctx) : undefined;
  ctx.partials.layer3 = parts.layer3;

  // Layer 3.5: clutter hints
  parts.layer3_5 = (typeof layer03_5Compute === 'function') ? layer03_5Compute(ctx) : undefined;
  ctx.partials.layer3_5 = parts.layer3_5;

  // Layer 4: specials
  parts.layer4 = (typeof layer04Compute === 'function') ? layer04Compute(ctx) : undefined;
  ctx.partials.layer4 = parts.layer4;

  // Layer 5: visual adjustments
  parts.layer5 = (typeof layer05Compute === 'function') ? layer05Compute(ctx) : undefined;
  ctx.partials.layer5 = parts.layer5;

  // Merge partials into final tile
  const tile = mergeParts({ q, r, seed: String(seed) }, parts, ctx);
  // attach deterministic debug provenance
  tile.debug = tile.debug || {};
  // do not include non-deterministic timestamps here; keep debug deterministic
  return tile;
}

export { generateTile, getDefaultConfig, normalizeConfig };
