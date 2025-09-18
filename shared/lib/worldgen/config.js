// shared/lib/worldgen/config.js
// Default configuration and layer toggles

export const DEFAULT_CONFIG = {
  // Global multiplier applied to the final elevation (rendered height).
  // This does not change biome/sea classification which is computed from
  // the unscaled elevation; it only scales the returned tile.height.
  // maximum world height (units). Normalized elevations (0..1) are
  // interpreted as a percentage of this value.
  maxHeight: 100,
  // Global multiplier applied to the final elevation (rendered height).
  // Final world units = normalized * maxHeight * scale
  scale: 1,
  // Optional additional renderer-side exaggeration factor historically
  // used by clients; keep here for centralized tuning.
  heightMagnitude: 1,
  layers: {
    // Global tuning values that affect multiple layers (authoritative sea level)
    global: {
      seaLevel: .20
    },
    layer0: {
      paletteId: 'default'
    },
    layer1: {
      continentalMask: {
        scale: 880,
        power: 1.08,
        remapLow: 0.28,
        remapHigh: 0.74,
        latitudeWeight: 0.18,
        latitudePower: 1.6,
        postBias: -0.08,
        postScale: 1.05,
        clampMin: 0,
        clampMax: 1
      },
      warp: {
        slow: { amplitude: 240, scale: 0.0016, offset: 37.19 },
        fast: { amplitude: 28, scale: 0.0075, offset: 113.37 }
      },
      plates: {
        cellSize: 420,
        jitter: 0.55,
        relaxation: 0.68,
        edgeNormalization: 1.08,
        interiorBoost: 0.24,
        interiorExponent: 1.32
      },
      ridges: {
        amplitude: 0.42,
        width: 0.42,
        sharpness: 1.55,
        noiseFactor: 0.45,
        trenchThreshold: 0.32,
        trenchStrength: 0.65
      },
      mediumDetail: {
        scale: 210,
        amplitude: 0.32,
        octaves: 2,
        lacunarity: 2.2,
        gain: 0.55,
        coastFadeStart: 0.05,
        coastFadeEnd: 0.3,
        plateFadeStart: 0.1,
        plateFadeEnd: 0.45,
        weightExponent: 1.05
      },
      combine: {
        maskWeight: 1.0,
        ridgeWeight: 1.0,
        detailWeight: 0.65,
        interiorWeight: 0.35,
        maskOffset: -0.05
      },
      normalization: {
        min: -1.1,
        max: 0.96,
        exponent: 1.18,
        clampMin: 0,
        clampMax: 1
      },
      ocean: {
        depthScale: 1.25
      }
    },
    layer2: {
      regionNoiseScale: 0.02,
      maxInlandDistance: 100,
      amplitude: 0.1,
      frequency: 0.02,
      octaves: 3,
      roughnessScale: 0.5
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
