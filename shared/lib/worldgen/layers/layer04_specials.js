// shared/lib/worldgen/layers/layer04_specials.js
// Layer 4: special/rare regions

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
  const noise = makeSimplex(String(ctx.seed));
  const sampler = fbmFactory(noise, 2, 2.0, 0.5);
  const n = sampler(ctx.x * 0.002, ctx.z * 0.002); // -1..1
  const v = (n + 1) / 2; // 0..1
  // rarity threshold depends on rarityMultiplier
  const thr = 0.995 * (1 / (ctx.cfg.layers.layer4.rarityMultiplier || 1));
  if (v > thr) {
    const idx = Math.floor(v * SPECIALS.length) % SPECIALS.length;
    return { special: { key: SPECIALS[idx], rarity: 1 / (1 - v) } };
  }
  return { special: null };
}

export { computeTilePart };
