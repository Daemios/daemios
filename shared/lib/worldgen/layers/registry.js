// shared/lib/worldgen/layers/registry.js
// Central registry mapping friendly layer names to numeric part keys and
// (optionally) to human-readable descriptions. Keep this file minimal so
// the orchestrator can import it and avoid duplicating mappings.

export const LAYER_REGISTRY = {
  palette: { key: 'layer0', desc: 'Palette and creative constraints' },
  continents: { key: 'layer1', desc: 'Continents and bathymetry' },
  plates_and_mountains: { key: 'layer1', desc: 'Plates and mountains (mesoscale)' },
  biomes: { key: 'layer3', desc: 'Semantic biome attributes' },
  clutter: { key: 'layer3_5', desc: 'Ground clutter hints' },
  specials: { key: 'layer4', desc: 'Special/rare regions' }
};
