// shared/lib/worldgen/layers/registry.js
// Central registry mapping friendly layer names to numeric part keys and
// (optionally) to human-readable descriptions. Keep this file minimal so
// the orchestrator can import it and avoid duplicating mappings.

export const LAYER_REGISTRY = {
  palette: { key: 'palette', desc: 'Palette and creative constraints' },
  continents: { key: 'continents', desc: 'Continents and bathymetry' },
  plates_and_mountains: { key: 'plates_and_mountains', desc: 'Plates and mountains (mesoscale)' },
  biomes: { key: 'biomes', desc: 'Semantic biome attributes' },
  clutter: { key: 'clutter', desc: 'Ground clutter hints' },
  specials: { key: 'specials', desc: 'Special/rare regions' }
};
