// shared/lib/worldgen/config.js
// Default configuration and layer toggles (kept minimal and JSON-serializable)

export const DEFAULT_CONFIG = {
  layers: {
    layer0: {
      paletteId: 'default'
    },
    layer1: {
      continentScale: 1.0,
      seaLevel: 0.52,
      plateCellSize: 256,
    },
    layer2: {
      regionNoiseScale: 0.02,
      maxInlandDistance: 100
    },
    layer3: {
      ecotoneThreshold: 0.25
    },
    layer3_5: {
      clutterDensity: 8
    },
    layer4: {
      rarityMultiplier: 1.0
    },
    layer5: {
      mountainExaggeration: 1.5,
      snowlineBias: -0.08
    }
  },
  visual_style: {
    global_saturation: 1.15,
    global_contrast: 1.10,
    fog_strength: 0.4,
    mountain_exaggeration: 1.5,
    snowline_bias: -0.08
  }
};

// ESM export already provided above.
