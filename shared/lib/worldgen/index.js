// shared/lib/worldgen/index.js
// Public shared API for deterministic world tile generation.
// Minimal skeleton: calls layer modules and merges partial outputs.

import { DEFAULT_CONFIG } from './config.js';
import { create as createRng } from './rng.js';
import * as noise from './noiseUtils.js';
import { computeTilePart as PaletteCompute } from './layers/palette.js';
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
  if (partial && typeof partial.scale === 'number') base.scale = partial.scale;
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
  if (enabled.layer0 !== false) parts.layer0 = PaletteCompute(ctx);
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
    // When layer1 is explicitly disabled, do not call the fallback (which
    // can introduce a visible pattern). Leave the part undefined so the
    // merge step retains the base elevation only.
    parts.layer1 = undefined;
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

// Bulk sampling helper for callers that want compact typed buffers instead
// of full Tile objects. This defaults to the same behavior as repeated
// generateTile calls but centralizes the loop so consumers can optimize
// or replace this implementation later with a lighter-weight fast-path.
function sampleBlock(seed, qOrigin, rOrigin, S, cfgPartial) {
  const N = 2 * S + 1;
  const len = N * N;
  const isWaterBuf = new Uint8Array(len);
  const yScaleBuf = new Float32Array(len);
  let idx = 0;
  const cfg = normalizeConfig(cfgPartial);
  for (let r = -S; r <= S; r++) {
    for (let q = -S; q <= S; q++) {
      const qW = q + qOrigin;
      const rW = r + rOrigin;
      const tile = generateTile(seed, { q: qW, r: rW }, cfg);
      let isWater = false;
      try {
        if (tile) {
          if (tile.flags && Array.isArray(tile.flags) && tile.flags.includes('water')) isWater = true;
          else if (tile.bathymetry && typeof tile.bathymetry.depthBand === 'string') {
            const db = tile.bathymetry.depthBand;
            isWater = (db === 'deep' || db === 'shallow');
          }
        }
      } catch (e) {
        isWater = false;
      }
      isWaterBuf[idx] = isWater ? 1 : 0;
      const ys = (tile && tile.elevation && typeof tile.elevation.normalized === 'number') ? Math.max(0, Math.min(1, tile.elevation.normalized)) : 0;
      yScaleBuf[idx] = ys;
      idx += 1;
    }
  }
  // Small diagnostic: do not spam in normal runs; keep concise sample for debugging
  try {
    // eslint-disable-next-line no-console
    console.log('[shared.worldgen] sampleBlock: sample', { qOrigin, rOrigin, S, N, sampleFirst: Array.prototype.slice.call(isWaterBuf.subarray(0, Math.min(12, len))), yFirst: Array.prototype.slice.call(yScaleBuf.subarray(0, Math.min(6, len))) });
  } catch (e) { /* ignore */ }
  return { isWaterBuf, yScaleBuf, N };
}

export { sampleBlock };

// Lightweight block sampler: run only the expensive-but-sufficient layer01
// (continents/bathymetry) per-tile and produce compact buffers. This avoids
// the full merge/palette/interpreter work and is a good fast-path for
// clients that only need water/elevation info for a neighborhood.
function sampleBlockLight(seed, qOrigin, rOrigin, S, cfgPartial) {
  const N = 2 * S + 1;
  const len = N * N;
  const isWaterBuf = new Uint8Array(len);
  const yScaleBuf = new Float32Array(len);
  let idx = 0;
  const cfg = normalizeConfig(cfgPartial);
  for (let r = -S; r <= S; r++) {
    for (let q = -S; q <= S; q++) {
      const qW = q + qOrigin;
      const rW = r + rOrigin;
      // local x,z for layer samplers
      const { x, z } = axialToXZLocal(qW, rW);
      const ctx = { seed: String(seed), q: qW, r: rW, x, z, cfg, rng: createRng(seed, x, z), noise };
      let part1 = null;
      try {
        part1 = (typeof layer01Compute === 'function') ? layer01Compute(ctx) : (typeof layer01Fallback === 'function' ? layer01Fallback(ctx) : null);
      } catch (e) {
        try { part1 = (typeof layer01Fallback === 'function') ? layer01Fallback(ctx) : null; } catch (e2) { part1 = null; }
      }
      const elev = (part1 && part1.elevation && typeof part1.elevation.normalized === 'number') ? part1.elevation.normalized : 0;
      const seaLevel = (part1 && part1.bathymetry && typeof part1.bathymetry.seaLevel === 'number') ? part1.bathymetry.seaLevel : (cfg && cfg.layers && cfg.layers.global && typeof cfg.layers.global.seaLevel === 'number' ? cfg.layers.global.seaLevel : 0.22);
      const isWater = elev <= seaLevel;
      isWaterBuf[idx] = isWater ? 1 : 0;
      yScaleBuf[idx] = Math.max(0, Math.min(1, elev));
      idx += 1;
    }
  }
  try {
    // eslint-disable-next-line no-console
    console.log('[shared.worldgen] sampleBlockLight: sample', { qOrigin, rOrigin, S, N, sampleFirst: Array.prototype.slice.call(isWaterBuf.subarray(0, Math.min(12, len))), yFirst: Array.prototype.slice.call(yScaleBuf.subarray(0, Math.min(6, len))) });
  } catch (e) { /* ignore */ }
  return { isWaterBuf, yScaleBuf, N };
}

export { sampleBlockLight };
