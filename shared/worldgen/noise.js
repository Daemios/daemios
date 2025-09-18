import { generateTile, normalizeConfig } from '../lib/worldgen/index.js';

const cache = new Map();

export function initNoise(seed = '', cfgPartial = null) {
  const cfg = normalizeConfig(cfgPartial || {});
  const key = `${seed}:${JSON.stringify(cfgPartial || {})}`;
  if (cache.has(key)) return cache.get(key);
  const state = { seed: String(seed), cfg };
  cache.set(key, state);
  return state;
}

function clamp01(v) {
  if (Number.isNaN(v)) return 0;
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

export function sampleNoise(state, x, y) {
  if (!state || typeof state.seed === 'undefined') throw new Error('sampleNoise requires initNoise state');
  const tile = generateTile(state.seed, { q: x, r: y }, state.cfg);
  const seaLevel = (state.cfg && state.cfg.layers && state.cfg.layers.global && typeof state.cfg.layers.global.seaLevel === 'number')
    ? state.cfg.layers.global.seaLevel
    : 0.32;
  const elevation = tile && tile.elevation && typeof tile.elevation.normalized === 'number' ? clamp01(tile.elevation.normalized) : 0;
  const moisture = tile && tile.climate && typeof tile.climate.moisture === 'number' ? clamp01(tile.climate.moisture) : 0;
  const clutterDensity = tile && tile.clutter && typeof tile.clutter.density === 'number' ? tile.clutter.density : 0;
  const flora = clamp01(clutterDensity / Math.max(1, (state.cfg.layers.layer3_5 && state.cfg.layers.layer3_5.clutterDensity) || 6));
  const passable = !(tile && tile.flags && tile.flags.includes('water')) && elevation > seaLevel + 0.02;
  const territory = tile && tile.biome && tile.biome.major ? tile.biome.major : 'unknown';
  return {
    elevation,
    moisture,
    flora,
    passable: passable ? 1 : 0,
    territory,
    tile,
  };
}

export default { initNoise, sampleNoise };
