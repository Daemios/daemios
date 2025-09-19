// Palette — creative constraints and base palette selection.
// Purpose: supply a palette id and default color set used later by the renderer
// to resolve final visual materials for a tile.

const DEFAULT_PALETTES = {
  default: {
    topColor: '#8ccf72',
    sideColor: '#6aa24f',
    slopeTint: '#7fbf60'
  }
};

function computeTilePart(ctx) {
  // prefer canonical 'palette' key
  const pid = (ctx && ctx.cfg && ctx.cfg.layers && ctx.cfg.layers.palette && ctx.cfg.layers.palette.paletteId)
    ? ctx.cfg.layers.palette.paletteId
    : 'default';
  const p = DEFAULT_PALETTES[pid] || DEFAULT_PALETTES.default;
  if (!DEFAULT_PALETTES[pid]) {
    return { palette: { id: 'fallback', topColor: '#000000', sideColor: '#000000', slopeTint: '#000000' } };
  }
  return { palette: Object.assign({ id: pid }, p) };
}

export { computeTilePart };
