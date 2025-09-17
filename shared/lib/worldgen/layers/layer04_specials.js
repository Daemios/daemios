// shared/lib/worldgen/layers/layer04_specials.js
// Layer 4: special/rare region overrides using a shared mask.

import { fbm as fbmFactory } from '../noiseUtils.js';
import { makeSimplex } from '../noiseFactory.js';

const SPECIALS = [
  'frozen_jungle',
  'volcanic_seafloor',
  'glass_desert',
  'obsidian_flats',
  'mushroom_glade',
  'crystal_basin',
];

function ensureShared(ctx) {
  if (!ctx.shared) ctx.shared = { caches: { noise: new Map() }, fields: {} };
  if (!ctx.shared.caches) ctx.shared.caches = { noise: new Map() };
  if (!ctx.shared.caches.noise) ctx.shared.caches.noise = new Map();
  if (!ctx.shared.fields) ctx.shared.fields = {};
  return ctx.shared;
}

function getNamedNoise(ctx, key) {
  const shared = ensureShared(ctx);
  const cache = shared.caches.noise;
  if (cache.has(key)) return cache.get(key);
  const noise = makeSimplex(`${ctx.seed}:${key}`);
  cache.set(key, noise);
  return noise;
}

function computeTilePart(ctx) {
  const cfg = (ctx.cfg && ctx.cfg.layers && ctx.cfg.layers.layer4) ? ctx.cfg.layers.layer4 : {};
  const freq = typeof cfg.maskFreq === 'number' ? cfg.maskFreq : 0.0015;
  const octaves = Math.max(1, Math.floor(cfg.maskOctaves || 3));
  const gain = cfg.maskGain || 0.55;
  const rarityMultiplier = cfg.rarityMultiplier || 1;
  const noise = getNamedNoise(ctx, 'specialMask');
  const sampler = fbmFactory(noise, octaves, 2.1, gain);
  const v = sampler(ctx.x * freq, ctx.z * freq);
  const normalized = (v + 1) / 2;
  const threshold = Math.max(0.995, 0.9985 - rarityMultiplier * 0.0025);
  if (normalized > threshold) {
    const idx = Math.floor(normalized * SPECIALS.length) % SPECIALS.length;
    const rarity = Math.max(1, Math.round(1 / Math.max(1e-6, 1 - normalized)));
    return { special: { key: SPECIALS[idx], rarity } };
  }
  return { special: null };
}

export { computeTilePart };
