// shared/lib/worldgen/layers/layer04_specials.js
// Layer 4: special/rare regions (stub)

import { fbm } from '../noiseUtils.js';

const SPECIALS = ['frozen_jungle','volcanic_seafloor','glass_desert','obsidian_flats','mushroom_glade'];

function computeTilePart(ctx) {
  const v = fbm(ctx, ctx.x * 0.002, ctx.z * 0.002, 2);
  // rarity threshold depends on rarityMultiplier
  const thr = 0.995 * (1 / (ctx.cfg.layers.layer4.rarityMultiplier || 1));
  if (v > thr) {
    const idx = Math.floor(v * SPECIALS.length) % SPECIALS.length;
    return { special: { key: SPECIALS[idx], rarity: 1 / (1 - v) } };
  }
  return { special: null };
}

export { computeTilePart };
