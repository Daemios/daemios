// client/src/3d2/domain/world/adapters/sharedWorldgen.js
// ESM adapter for the shared worldgen.

import * as shared from '../../../../../shared/lib/worldgen/index.js';

export function generateTile(seed, coords, cfg) {
  return shared.generateTile(seed, coords, cfg);
}

export function getDefaultConfig() {
  return shared.getDefaultConfig();
}

// Bulk sampling helper: produce compact typed arrays for isWater (0/1) and yScale
export function sampleBlock(seed, qOrigin, rOrigin, S, cfg) {
  // Prefer the light-weight fast path when available to avoid creating full
  // Tile objects for each sampled coordinate. Fall back to the full sampler
  // implemented in shared worldgen when not present.
  try {
    if (shared && typeof shared.sampleBlockLight === 'function') {
      return shared.sampleBlockLight(seed, qOrigin, rOrigin, S, cfg);
    }
  } catch (e) {
    // ignore and fall back
  }
  // Fallback: full-sample loop (kept for compatibility)
  const N = 2 * S + 1;
  const len = N * N;
  const isWaterBuf = new Uint8Array(len);
  const yScaleBuf = new Float32Array(len);
  let idx = 0;
  const _samples = [];
  for (let r = -S; r <= S; r++) {
    for (let q = -S; q <= S; q++) {
      const qW = q + qOrigin;
      const rW = r + rOrigin;
      const tile = shared.generateTile(seed, { q: qW, r: rW }, cfg);
      // Determine water via bathymetry.depthBand ('deep'|'shallow'|'land') or via flags
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
      if (_samples.length < 12) {
        try {
          _samples.push({ q: qW, r: rW, elev: (tile && tile.elevation && typeof tile.elevation.normalized === 'number') ? tile.elevation.normalized : null, depthBand: (tile && tile.bathymetry && tile.bathymetry.depthBand) ? tile.bathymetry.depthBand : null, flags: tile && tile.flags ? tile.flags.slice(0,4) : null });
        } catch (e) { /* ignore */ }
      }
      idx += 1;
    }
  }
  try { console.log('[sharedWorldgen] sampleBlock sampleTiles:', _samples); } catch (e) { /* ignore */ }
  return { isWaterBuf, yScaleBuf, N };
}
