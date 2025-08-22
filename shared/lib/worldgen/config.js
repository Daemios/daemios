// shared/lib/worldgen/config.js
// Default configuration and layer toggles (kept minimal and JSON-serializable)

export const DEFAULT_CONFIG = {
  layers: {
    enabled: {
      layer0: true,
      layer1: true,
      layer2: true,
      layer3: true,
      layer3_5: true,
      layer4: true,
      layer5: true
    },
    layer0: {
      paletteId: 'default'
    },
    layer1: {
      continentScale: 1.0,
      seaLevel: 0.52,
      plateCellSize: 48
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
