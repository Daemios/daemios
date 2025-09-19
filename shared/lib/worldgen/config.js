export const DEFAULT_CONFIG = {
  seed: 'micky',
  maxHeight: 100,
  scale: 1,
  heightMagnitude: 1,
  layersOrder: [ 'continents', 'plates_and_mountains', 'biomes', 'specials', 'clutter' ],
  layers: {
    global: { seaLevel: 0.20 },
    layer0: { paletteId: 'default' },
    layer1: {
      clampAboveSea: 0.02,
      continentScale: 1.0,
      warp: { slow: { freq: 0.08, amp: 0.25 }, fast: { freq: 0.6, amp: 0.05 } },
      detail: { freq: 0.6, amp: 0.15 }
    },
    layer3: { ecotoneThreshold: 0.25 },
    layer3_5: { clutterDensity: 8 },
    layer4: { rarityMultiplier: 1.0 }
  },
  visual_style: {
    global_saturation: 1.15,
    global_contrast: 1.10,
    fog_strength: 0.4,
    mountain_exaggeration: 1.5,
    snowline_bias: -0.08
  }
};
