// shared/lib/worldgen/layers/clutter.js
// Layer 3.5: clutter hints (density, candidate sets)

function computeTilePart(ctx) {
  const cfg = (ctx && ctx.cfg && ctx.cfg.layers && ctx.cfg.layers.layer3_5) ? ctx.cfg.layers.layer3_5 : {};
  const density = Math.max(0, Math.min(8, cfg.clutterDensity || 8));
  const sets = ['trees','bushes','rocks'];
  // simple slope check heuristic (if slope exists in partials)
  const slope = (ctx.partials && ctx.partials.layer1 && typeof ctx.partials.layer1.slope === 'number') ? ctx.partials.layer1.slope : 0;
  const allowed = slope > 0.35 ? [] : sets;
  return { clutterHints: { density, sets: allowed } };
}

export { computeTilePart };
