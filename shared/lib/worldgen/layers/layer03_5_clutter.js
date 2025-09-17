// shared/lib/worldgen/layers/layer03_5_clutter.js
// Layer 3.5: clutter placement based on biome, relief, and ecotone blend.

function clamp01(v) {
  if (Number.isNaN(v)) return 0;
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

function ensureShared(ctx) {
  if (!ctx.shared) ctx.shared = { fields: {} };
  if (!ctx.shared.fields) ctx.shared.fields = {};
  return ctx.shared;
}

function computeTilePart(ctx) {
  const shared = ensureShared(ctx);
  const cfg = (ctx.cfg && ctx.cfg.layers && ctx.cfg.layers.layer3_5) ? ctx.cfg.layers.layer3_5 : {};
  const baseDensity = typeof cfg.clutterDensity === 'number' ? cfg.clutterDensity : 6;
  const biome = (ctx.shared && ctx.shared.biome) || (ctx.partials && ctx.partials.layer3 && ctx.partials.layer3.biome) || { major: 'Grassland', secondary: 'Forest', blend: 0 };
  const setsConfig = cfg.biomeSets || {};
  const majorSet = setsConfig[biome.major] || { sets: ['grasses'], densityScale: 1 };
  const secondarySet = setsConfig[biome.secondary] || null;
  const reliefIndex = typeof ctx.shared?.reliefIndex === 'number' ? ctx.shared.reliefIndex : 0.5;
  const climate = (ctx.shared && ctx.shared.climate) || { moisture: 0.5, oceanProximity: 0.3 };

  let density = baseDensity * (majorSet.densityScale ?? 1);
  density *= 0.6 + clamp01(reliefIndex) * 0.6;
  density *= 0.6 + clamp01(climate.moisture) * 0.5;
  if (biome.major === 'DeepOcean' || biome.major === 'ShallowSea') density *= 0.7 + clamp01(climate.oceanProximity) * 0.6;
  if (biome.major === 'Glacier') density *= 0.5;

  const sets = new Set();
  (majorSet.sets || []).forEach((s) => sets.add(s));
  if (secondarySet && (biome.blend || 0) > 0.05) {
    (secondarySet.sets || []).forEach((s) => sets.add(s));
  }
  const finalSets = Array.from(sets);

  shared.fields.clutterDensity = density;
  shared.fields.clutterSets = finalSets;

  return { clutter: { density, sets: finalSets, blend: clamp01(biome.blend || 0) } };
}

export { computeTilePart };
