// shared/lib/worldgen/layers/palette.js
// Layer 0: palette & creative constraints. Minimal implementation returns a palette id and default colors.

const DEFAULT_PALETTES = {
  default: {
    topColor: '#8ccf72',
    sideColor: '#6aa24f',
    slopeTint: '#7fbf60'
  }
};

function computeTilePart(ctx) {
  const pid = ctx.cfg.layers.layer0.paletteId || 'default';
  const p = DEFAULT_PALETTES[pid] || DEFAULT_PALETTES.default;
  if (!DEFAULT_PALETTES[pid]) {
    return { palette: { id: 'fallback', topColor: '#000000', sideColor: '#000000', slopeTint: '#000000' } };
  }
  return { palette: Object.assign({ id: pid }, p) };
}

export { computeTilePart };
