// Clutter — ground clutter hints (density and candidate sets).
// Purpose: provide non-visual hints about ground clutter (trees, rocks, etc.)
// that the renderer or placement systems can use to spawn scene objects.

function computeTilePart(ctx) {
  // prefer canonical 'clutter' config
    const cfg = (ctx && ctx.cfg && ctx.cfg.layers && ctx.cfg.layers.clutter) ? ctx.cfg.layers.clutter : {};
  const density = Math.max(0, Math.min(8, cfg.clutterDensity || 8));
  const sets = ['trees','bushes','rocks'];
  // simple slope check heuristic (if slope exists in partials)
    const slope = (ctx.partials && ctx.partials.continents && typeof ctx.partials.continents.slope === 'number') ? ctx.partials.continents.slope : 0;
  const allowed = slope > 0.35 ? [] : sets;
  return { clutterHints: { density, sets: allowed } };
}

export { computeTilePart };
