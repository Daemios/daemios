export const DEFAULT_CONFIG = {
  seed: 'test',
  maxHeight: 100,
  scale: 1,
  heightMagnitude: 1,
  layersOrder: [ 'continents', 'plates_and_mountains', 'biomes', 'specials', 'variation', 'clutter' ],
  layers: {
    global: { seaLevel: 0.20 },

    // canonical (file-name keyed) layer configs
    palette: { paletteId: 'default' },
    continents: {
      clampAboveSea: 0.02,
      continentScale: 1.0,
      warp: { slow: { freq: 0.08, amp: 0.25 }, fast: { freq: 0.6, amp: 0.05 } },
      detail: { freq: 0.6, amp: 0.15 }
    },
    plates_and_mountains: {},
    biomes: { ecotoneThreshold: 0.25 },
      variation: { variationAmplitude: 0.008, fbm: { octaves: 3, lacunarity: 1.0, gain: 2.5 } },
    clutter: { clutterDensity: 8 },
    specials: { rarityMultiplier: 1.0 },

  // legacy aliases removed — use canonical file-name keys (e.g. 'continents')
  },
  visual_style: {
    global_saturation: 1.15,
    global_contrast: 1.10,
    fog_strength: 0.4,
    mountain_exaggeration: 1.5,
    snowline_bias: -0.08
  }
};
