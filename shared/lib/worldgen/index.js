// shared/lib/worldgen/index.js
// Public shared API for deterministic world tile generation.
// Minimal skeleton: calls layer modules and merges partial outputs.

/**
 * Context (ctx) contract used by layer modules:
 * - seed: string (world seed)
 * - q,r: hex axial coordinates (optional)
 * - x,z: world-space coordinates (number)
 * - cfg: normalized configuration object returned by normalizeConfig()
 * - rng: small per-tile RNG created by createRng(seed,x,z)
 * - noise: noise utilities (makeSimplex, fbm, domainWarp, etc.)
 * - partials: object populated during generation containing previously
 *   produced numeric parts (e.g. ctx.partials.layer1)
 *
 * Layers MAY add fields to ctx.partials (for downstream passes) but should
 * avoid mutating other ctx properties. Keep ctx deterministic and serializable.
 */

import { DEFAULT_CONFIG } from './config.js';
import { create as createRng } from './utils/rng.js';
import * as noise from './utils/noise.js';
import { computeTilePart as PaletteCompute } from './layers/palette.js';
import { computeTilePart as layer01Compute } from './layers/continents.js';
// regions layer (layer02) removed by refactor
import { computeTilePart as layer03Compute } from './layers/biomes.js';
import { computeTilePart as layer03_5Compute } from './layers/clutter.js';
import { computeTilePart as layer04Compute } from './layers/specials.js';
// visual layer removed by refactor (layer05)
import { computeTilePart as platesCompute } from './layers/plates_and_mountains.js';
import { LAYER_REGISTRY } from './layers/registry.js';
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
  // prefer explicit seed argument, otherwise fall back to cfg.seed (if any)
  let { q, r, x, z } = coords || {};
  if (typeof x !== 'number' || typeof z !== 'number') {
    ({ x, z } = axialToXZLocal(q, r));
  }
  const cfg = normalizeConfig(cfgPartial);
  const effectiveSeed = (typeof seed !== 'undefined' && seed !== null) ? seed : (cfg && cfg.seed ? cfg.seed : '0');
  const ctx = { seed: String(effectiveSeed), q, r, x, z, cfg, rng: createRng(effectiveSeed, x, z), noise };
  const enabled = cfg._enabledLayers || {};

  // run layers in order; parts are partial tile outputs consumed by later layers
  const parts = {};

  // Simple friendly-order driven execution: call each friendly layer in
  // `cfg.layersOrder` (or DEFAULT_CONFIG.layersOrder) and merge additive
  // elevation contributions into numeric `parts` keys consumed by mergeParts.
  const friendlyOrder = (cfg && Array.isArray(cfg.layersOrder) && cfg.layersOrder.length) ? cfg.layersOrder : DEFAULT_CONFIG.layersOrder || [];

  // Build handlers by combining the lightweight registry with actual
  // computation functions. This keeps the canonical keys centralized in
  // one place while allowing index.js to provide the function references.
  const handlers = {
    palette: Object.assign({}, LAYER_REGISTRY.palette, { fn: PaletteCompute }),
  continents: Object.assign({}, LAYER_REGISTRY.continents, { fn: layer01Compute }),
    plates_and_mountains: Object.assign({}, LAYER_REGISTRY.plates_and_mountains, { fn: platesCompute }),
    biomes: Object.assign({}, LAYER_REGISTRY.biomes, { fn: layer03Compute }),
    clutter: Object.assign({}, LAYER_REGISTRY.clutter, { fn: layer03_5Compute }),
    specials: Object.assign({}, LAYER_REGISTRY.specials, { fn: layer04Compute }),
  };

  for (const name of friendlyOrder) {
    const h = handlers[name];
    if (!h) continue; // unknown friendly name
    const lk = h.key;
    // respect explicit enabled toggles (enabled uses numeric layer keys)
    if (enabled[lk] === false) {
      parts[lk] = undefined;
      ctx.partials = Object.assign({}, ctx.partials, { [lk]: parts[lk] });
      continue;
    }

    try {
      let p = null;
      // Run the layer's compute function. Per project policy, do not
      // attempt to call per-layer fallback shims; surface errors instead
      // by returning an undefined part (the outer try/catch will handle
      // logging). This keeps failures deterministic and visible.
      p = (typeof h.fn === 'function') ? h.fn(ctx) : null;

      // Additively merge elevation into the numeric part slot so mergeParts
      // can still iterate known numeric layers. Preserve and merge other
      // fields (bathymetry, slope, plate) if present.
      if (p && p.elevation && typeof p.elevation.raw === 'number') {
        if (!parts[lk]) parts[lk] = { elevation: { raw: 0, normalized: 0 } };
        parts[lk].elevation = parts[lk].elevation || { raw: 0, normalized: 0 };
        parts[lk].elevation.raw += p.elevation.raw;
        parts[lk].elevation.normalized = Math.max(0, Math.min(1, parts[lk].elevation.raw));
      }

      if (!parts[lk]) parts[lk] = p;
      else if (p) {
        for (const k of Object.keys(p)) {
          if (k === 'elevation') continue;
          parts[lk][k] = p[k];
        }
      }
    } catch (e) {
      // Keep deterministic behavior (undefined part) but provide a
      // non-throwing debug message so failures are easier to diagnose.
      try {
        // eslint-disable-next-line no-console
        console.debug('[shared.worldgen] layer error', { layer: name, slot: lk, seed: ctx && ctx.seed, q: ctx && ctx.q, r: ctx && ctx.r, x: ctx && ctx.x, z: ctx && ctx.z, err: (e && e.stack) ? e.stack : String(e) });
      } catch (ee) { /* ignore logging errors */ }
      parts[lk] = undefined;
    }
    ctx.partials = Object.assign({}, ctx.partials, { [lk]: parts[lk] });
  }

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
        part1 = (typeof layer01Compute === 'function') ? layer01Compute(ctx) : null;
      } catch (e) {
        // Per project rules: do not call a fallback shim; just record null
        part1 = null;
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
