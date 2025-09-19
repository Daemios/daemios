// Specials — rare or anomalous region flags.
// Purpose: mark tiles that belong to special/rare regions (volcanic areas,
// glass deserts, mushroom glades, etc.) so gameplay and rendering systems can
// treat them differently.

import { fbm as fbmFactory } from '../utils/noise.js';
import { makeSimplex } from '../utils/noise.js';

const SPECIALS = [
  'frozen_jungle',
  'volcanic_seafloor',
  'glass_desert',
  'obsidian_flats',
  'mushroom_glade',
];

function computeTilePart(ctx) {
  // canonical specials config
  const cfg = (ctx && ctx.cfg && ctx.cfg.layers && ctx.cfg.layers.specials) ? ctx.cfg.layers.specials : {};
  const noise = makeSimplex(String(ctx.seed));
  const sampler = fbmFactory(noise, 2, 2.0, 0.5);
  const n = sampler(ctx.x * 0.002, ctx.z * 0.002); // -1..1
  const v = (n + 1) / 2; // 0..1
  // rarity threshold depends on rarityMultiplier
  const thr = 0.995 * (1 / (cfg.rarityMultiplier || 1));
  if (v > thr) {
    const idx = Math.floor(v * SPECIALS.length) % SPECIALS.length;
    return { special: { key: SPECIALS[idx], rarity: 1 / (1 - v) } };
  }
  return { special: null };
}

export { computeTilePart };
