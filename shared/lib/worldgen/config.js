// shared/lib/worldgen/config.js
// Default configuration and layer toggles

export const DEFAULT_CONFIG = {
  // Maximum physical height (world units). Elevation samples are normalized
  // into 0..1 and later scaled by this value during merge.
  maxHeight: 160,
  // Global multiplier applied at the end (client-side exaggeration hook).
  scale: 1,
  heightMagnitude: 1,
  baseElevation: 0.02,
  layers: {
    global: {
      seaLevel: 0.32
    },
    climate: {
      coastWidth: 0.22,
      lapseRate: 0.58,
      oceanTemperatureMix: 0.35,
      rainShadowStrength: 0.38,
      altitudeDryness: 0.28
    },
    layer0: {
      paletteId: 'default'
    },
    layer1: {
      macro: {
        freq: 0.0028,
        octaves: 5,
        lacunarity: 1.85,
        gain: 0.46,
        scale: 1.0
      },
      latitudeScale: 1600,
      warp: {
        slow: { freqA: 0.05, ampA: 0.35, freqB: 0.32, ampB: 0.08 },
        fast: { freqA: 0.42, ampA: 0.2, freqB: 1.15, ampB: 0.05 }
      },
      plates: {
        cellSize: 320,
        ridgeAmp: 0.6,
        ridgeSharpness: 1.45,
        ridgeNoiseFreq: 0.9,
        ridgeNoiseAmp: 0.45
      },
      detail: {
        freq: 0.035,
        amp: 0.18,
        octaves: 3,
        lacunarity: 2.1,
        gain: 0.55
      },
      shelfClamp: {
        shallowBand: 0.28,
        landMax: 0.92,
        threshold: 0.46,
        dampThreshold: 0.22,
        dampPower: 2.8,
        dampScale: 1.0
      }
    },
    layer2: {
      breakup: {
        freq: 0.014,
        octaves: 2,
        lacunarity: 1.9,
        gain: 0.6
      },
      regionWarp: {
        amp: 0.012,
        freq: 0.08
      },
      reliefIndex: {
        plateWeight: 0.42,
        detailWeight: 0.28,
        slopeWeight: 0.18,
        ridgeWeight: 0.12,
        exponent: 1.12,
        bias: 0
      },
      archetypes: [
        { id: 'InlandPlateau', elevationOffset: 0.08, reliefWeight: 1.2, reliefBias: 0.05, temperatureBias: -0.05, moistureBias: -0.02 },
        { id: 'VolcanicArc', elevationOffset: 0.14, reliefWeight: 1.35, reliefBias: 0.12, temperatureBias: 0.04, moistureBias: 0.05 },
        { id: 'DeltaPlain', elevationOffset: -0.04, reliefWeight: 0.85, reliefBias: -0.08, temperatureBias: 0.01, moistureBias: 0.18 },
        { id: 'CoastalShelf', elevationOffset: -0.02, reliefWeight: 0.9, reliefBias: -0.05, temperatureBias: 0.0, moistureBias: 0.08 },
        { id: 'Badlands', elevationOffset: 0.05, reliefWeight: 1.15, reliefBias: 0.08, temperatureBias: 0.06, moistureBias: -0.18 },
        { id: 'Shield', elevationOffset: 0.02, reliefWeight: 1.05, reliefBias: 0.02, temperatureBias: -0.04, moistureBias: -0.05 }
      ]
    },
    layer3: {
      ecotoneThreshold: 0.24,
      elevationBands: {
        deepOcean: 0.12,
        abyss: 0.2,
        shelf: 0.3,
        coast: 0.36,
        lowland: 0.52,
        highland: 0.68,
        mountain: 0.82,
        peak: 0.92
      },
      biomes: {
        DeepOcean: {
          category: 'water',
          baseWeight: 1,
          elevationBands: { deepOcean: 1, abyss: 0.8 },
          temperatureCurve: [ { x: 0, w: 1 }, { x: 1, w: 0.6 } ],
          moistureCurve: [ { x: 0, w: 0.9 }, { x: 1, w: 1 } ],
          reliefCurve: [ { x: 0, w: 0.8 }, { x: 1, w: 0.2 } ],
          microRelief: { amp: 0.02, frequency: 0.8, octaves: 2, lacunarity: 2.2, gain: 0.5, reliefScale: 0.4 }
        },
        ShallowSea: {
          category: 'water',
          baseWeight: 1,
          elevationBands: { abyss: 0.8, shelf: 1, coast: 0.5 },
          temperatureCurve: [ { x: 0, w: 0.4 }, { x: 0.5, w: 0.9 }, { x: 1, w: 0.9 } ],
          moistureCurve: [ { x: 0, w: 1 }, { x: 1, w: 1 } ],
          reliefCurve: [ { x: 0, w: 1 }, { x: 1, w: 0.2 } ],
          microRelief: { amp: 0.025, frequency: 1.2, octaves: 2, lacunarity: 2.1, gain: 0.5, reliefScale: 0.25 }
        },
        Coast: {
          category: 'transition',
          baseWeight: 0.9,
          elevationBands: { shelf: 0.8, coast: 1, lowland: 0.6 },
          temperatureCurve: [ { x: 0, w: 0.6 }, { x: 0.6, w: 1 }, { x: 1, w: 0.8 } ],
          moistureCurve: [ { x: 0, w: 0.9 }, { x: 1, w: 1 } ],
          reliefCurve: [ { x: 0, w: 0.8 }, { x: 1, w: 0.4 } ],
          microRelief: { amp: 0.05, frequency: 1.6, octaves: 2, lacunarity: 2.3, gain: 0.55, reliefScale: 0.6 }
        },
        Grassland: {
          category: 'land',
          baseWeight: 1,
          elevationBands: { coast: 0.6, lowland: 1, highland: 0.45 },
          temperatureCurve: [ { x: 0, w: 0.3 }, { x: 0.5, w: 1 }, { x: 1, w: 0.8 } ],
          moistureCurve: [ { x: 0, w: 0.4 }, { x: 0.45, w: 1 }, { x: 1, w: 0.6 } ],
          reliefCurve: [ { x: 0, w: 1 }, { x: 0.6, w: 0.5 }, { x: 1, w: 0.2 } ],
          microRelief: { amp: 0.08, frequency: 1.8, octaves: 2, lacunarity: 2.2, gain: 0.55, reliefScale: 0.6 }
        },
        Forest: {
          category: 'land',
          baseWeight: 0.95,
          elevationBands: { coast: 0.4, lowland: 0.9, highland: 0.6 },
          temperatureCurve: [ { x: 0.1, w: 0.6 }, { x: 0.6, w: 1 }, { x: 1, w: 0.7 } ],
          moistureCurve: [ { x: 0.2, w: 0.8 }, { x: 0.6, w: 1 }, { x: 1, w: 0.9 } ],
          reliefCurve: [ { x: 0, w: 0.6 }, { x: 0.5, w: 1 }, { x: 1, w: 0.4 } ],
          microRelief: { amp: 0.1, frequency: 2.2, octaves: 2, lacunarity: 2.4, gain: 0.6, reliefScale: 0.7 }
        },
        Desert: {
          category: 'land',
          baseWeight: 0.8,
          elevationBands: { lowland: 0.8, highland: 0.6 },
          temperatureCurve: [ { x: 0.3, w: 0.4 }, { x: 0.8, w: 1 }, { x: 1, w: 0.7 } ],
          moistureCurve: [ { x: 0, w: 1 }, { x: 0.3, w: 0.4 }, { x: 1, w: 0.1 } ],
          reliefCurve: [ { x: 0, w: 0.2 }, { x: 1, w: 1 } ],
          microRelief: { amp: 0.14, frequency: 2.5, octaves: 2, lacunarity: 2.4, gain: 0.5, reliefScale: 1 }
        },
        Wetland: {
          category: 'land',
          baseWeight: 0.7,
          elevationBands: { coast: 0.7, lowland: 0.9 },
          temperatureCurve: [ { x: 0.2, w: 0.6 }, { x: 0.5, w: 1 }, { x: 1, w: 0.7 } ],
          moistureCurve: [ { x: 0.5, w: 0.8 }, { x: 1, w: 1 } ],
          reliefCurve: [ { x: 0, w: 1 }, { x: 0.4, w: 0.7 }, { x: 1, w: 0.2 } ],
          microRelief: { amp: 0.05, frequency: 1.4, octaves: 2, lacunarity: 2.1, gain: 0.55, reliefScale: 0.35 }
        },
        Highland: {
          category: 'land',
          baseWeight: 0.9,
          elevationBands: { highland: 1, mountain: 0.7 },
          temperatureCurve: [ { x: 0, w: 0.4 }, { x: 0.7, w: 1 }, { x: 1, w: 0.6 } ],
          moistureCurve: [ { x: 0, w: 0.5 }, { x: 0.6, w: 1 }, { x: 1, w: 0.8 } ],
          reliefCurve: [ { x: 0, w: 0.5 }, { x: 0.8, w: 1 }, { x: 1, w: 0.8 } ],
          microRelief: { amp: 0.12, frequency: 2.3, octaves: 2, lacunarity: 2.3, gain: 0.58, reliefScale: 0.9 }
        },
        Alpine: {
          category: 'land',
          baseWeight: 0.85,
          elevationBands: { mountain: 1, peak: 0.85 },
          temperatureCurve: [ { x: 0, w: 0.9 }, { x: 0.3, w: 0.5 }, { x: 0.6, w: 0.2 } ],
          moistureCurve: [ { x: 0, w: 0.6 }, { x: 0.5, w: 0.8 }, { x: 1, w: 0.7 } ],
          reliefCurve: [ { x: 0.2, w: 0.5 }, { x: 0.7, w: 1 }, { x: 1, w: 0.9 } ],
          microRelief: { amp: 0.16, frequency: 2.8, octaves: 2, lacunarity: 2.5, gain: 0.6, reliefScale: 1 }
        },
        Tundra: {
          category: 'land',
          baseWeight: 0.7,
          elevationBands: { highland: 0.8, mountain: 0.9 },
          temperatureCurve: [ { x: 0, w: 1 }, { x: 0.3, w: 0.6 }, { x: 0.6, w: 0.2 } ],
          moistureCurve: [ { x: 0, w: 0.4 }, { x: 0.5, w: 0.8 }, { x: 1, w: 0.6 } ],
          reliefCurve: [ { x: 0.2, w: 0.6 }, { x: 0.8, w: 1 } ],
          microRelief: { amp: 0.09, frequency: 2.1, octaves: 2, lacunarity: 2.2, gain: 0.55, reliefScale: 0.7 }
        },
        Glacier: {
          category: 'land',
          baseWeight: 0.6,
          elevationBands: { mountain: 0.8, peak: 1 },
          temperatureCurve: [ { x: 0, w: 1 }, { x: 0.2, w: 0.6 }, { x: 0.4, w: 0.2 } ],
          moistureCurve: [ { x: 0, w: 0.6 }, { x: 0.4, w: 0.8 }, { x: 1, w: 0.5 } ],
          reliefCurve: [ { x: 0.2, w: 0.5 }, { x: 0.8, w: 1 } ],
          microRelief: { amp: 0.11, frequency: 2.6, octaves: 2, lacunarity: 2.3, gain: 0.6, reliefScale: 0.8 }
        }
      }
    },
    layer3_5: {
      clutterDensity: 6,
      biomeSets: {
        Grassland: { sets: ['grasses', 'boulders'], densityScale: 1.0 },
        Forest: { sets: ['forest_trees', 'deadwood', 'boulders'], densityScale: 1.3 },
        Desert: { sets: ['cacti', 'dunes', 'rocks'], densityScale: 0.6 },
        Wetland: { sets: ['mangroves', 'driftwood'], densityScale: 0.9 },
        Highland: { sets: ['shrubs', 'rocks'], densityScale: 0.8 },
        Alpine: { sets: ['snow_pines', 'ice_chunks'], densityScale: 0.5 },
        Tundra: { sets: ['lichens', 'rock_spurs'], densityScale: 0.4 },
        Glacier: { sets: ['ice_spikes'], densityScale: 0.2 },
        DeepOcean: { sets: ['kelp', 'vents'], densityScale: 0.6 },
        ShallowSea: { sets: ['coral', 'seagrass'], densityScale: 0.8 },
        Coast: { sets: ['palms', 'driftwood'], densityScale: 1.1 }
      }
    },
    layer4: {
      rarityMultiplier: 1.0,
      maskFreq: 0.0015,
      maskOctaves: 3,
      maskGain: 0.55
    },
    layer5: {
      mountainExaggeration: 1.45,
      snowlineBias: -0.06
    }
  },
  visual_style: {
    global_saturation: 1.12,
    global_contrast: 1.08,
    fog_strength: 0.42,
    mountain_exaggeration: 1.45,
    snowline_bias: -0.06
  }
};
