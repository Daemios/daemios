// shared/lib/worldgen/layers/layer05_visual.js
// Layer 5: visual style adjustments (stub)

function computeTilePart(ctx) {
  const vs = ctx.cfg.visual_style || {};
  return { visual: { saturation: vs.global_saturation, contrast: vs.global_contrast, fog: vs.fog_strength } };
}

export { computeTilePart };
