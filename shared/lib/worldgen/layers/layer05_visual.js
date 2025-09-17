// shared/lib/worldgen/layers/layer05_visual.js
// Layer 5: visual adjustments informed by climate/relief for cohesive rendering.

function clamp01(v) {
  if (Number.isNaN(v)) return 0;
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

function computeTilePart(ctx) {
  const vs = ctx.cfg.visual_style || {};
  const cfg = (ctx.cfg && ctx.cfg.layers && ctx.cfg.layers.layer5) ? ctx.cfg.layers.layer5 : {};
  const climate = (ctx.shared && ctx.shared.climate) || { temperature: 0.5, moisture: 0.5 };
  const relief = typeof ctx.shared?.reliefIndex === 'number' ? ctx.shared.reliefIndex : 0.5;
  const snowBiasBase = typeof cfg.snowlineBias === 'number' ? cfg.snowlineBias : -0.06;
  const tempFactor = clamp01(1 - climate.temperature);
  const dynamicSnowBias = snowBiasBase - tempFactor * 0.08;
  const fog = (typeof vs.fog_strength === 'number' ? vs.fog_strength : 0.4) + relief * 0.1 * (1 - climate.temperature);
  return {
    visual: {
      saturation: vs.global_saturation,
      contrast: vs.global_contrast,
      fog,
      snowlineBias: dynamicSnowBias,
      mountainExaggeration: typeof cfg.mountainExaggeration === 'number' ? cfg.mountainExaggeration : vs.mountain_exaggeration,
    }
  };
}

export { computeTilePart };
