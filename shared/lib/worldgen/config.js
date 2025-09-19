// Layer-specific config objects (exported as part of DEFAULT_CONFIG.layers).
const paletteCfg = { paletteId: 'default' };
const continentsCfg = {
  clampAboveSea: 0.02,
  continentScale: 1.0,
  warp: { slow: { freq: 0.08, amp: 0.25 }, fast: { freq: 0.6, amp: 0.05 } },
  detail: { freq: 0.6, amp: 0.15 }
};
const platesAndMountainsCfg = {};
const biomesCfg = { ecotoneThreshold: 0.25 };
const clutterCfg = { clutterDensity: 8 };
const specialsCfg = { rarityMultiplier: 1.0 };

export const DEFAULT_CONFIG = {
  seed: 'micky',
  maxHeight: 100,
  scale: 1,
  heightMagnitude: 1,
  // use file names for ordering (these correspond to files in layers/)
  layersOrder: [ 'continents', 'plates_and_mountains', 'biomes', 'specials', 'clutter' ],
  layers: {
    global: { seaLevel: 0.20 },

    // canonical (file-name keyed) layer configs
    palette: paletteCfg,
    continents: continentsCfg,
    plates_and_mountains: platesAndMountainsCfg,
    biomes: biomesCfg,
    clutter: clutterCfg,
    specials: specialsCfg,

    // legacy aliases for backward compatibility (many modules still read layer0/1/etc.)
    layer0: paletteCfg,
    layer1: continentsCfg,
    layer2: platesAndMountainsCfg,
    layer3: biomesCfg,
    layer3_5: clutterCfg,
    layer4: specialsCfg
  },
  visual_style: {
    global_saturation: 1.15,
    global_contrast: 1.10,
    fog_strength: 0.4,
    mountain_exaggeration: 1.5,
    snowline_bias: -0.08
  }
};
