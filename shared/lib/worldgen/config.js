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
        frequency: 0.0024,
        octaves: 5,
        lacunarity: 1.85,
        gain: 0.45,
        bias: -0.08,
        power: 1.2,
        preWarpBlend: 0.25
      },
      warp: {
        slow: { frequency: 0.0012, amplitude: 140 },
        fast: { frequency: 0.0055, amplitude: 28 },
        fastPower: 1.0
      },
      plates: {
        cellSize: 520,
        jitter: 0.75,
        relaxation: 0.82,
        ridgeWidth: 0.22,
        ridgePower: 1.6,
        ridgeHeight: 0.32,
        ridgeNoiseFrequency: 0.0035,
        ridgeNoiseAmplitude: 0.65,
        trenchProbability: 0.32,
        trenchHeight: 0.42,
        trenchMultiplier: 1.8,
        trenchNoiseFrequency: 0.0026,
        trenchBias: -0.15
      },
      ridges: {
        slopeScale: 0.75
      },
      mediumDetail: {
        frequency: 0.014,
        amplitude: 0.18,
        octaves: 3,
        lacunarity: 1.9,
        gain: 0.5,
        coastFalloff: 0.28,
        coastExponent: 1.25,
        plateFalloff: 0.45,
        plateExponent: 0.65
      },
      combine: {
        maskWeight: 1.0,
        ridgeWeight: 0.6,
        detailWeight: 0.35,
        bias: 0.0
      },
      normalization: {
        min: -1,
        max: 1,
        exponent: 1.0
      },
      ocean: {
        depthScale: 1.5,
        trenchScale: 2.2,
        tieBreaker: 0.0005
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
