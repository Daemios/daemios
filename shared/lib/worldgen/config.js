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
      continentScale: 1.0,
      plateCellSize: 256,
      continentalMask: {
        frequency: 0.0035,
        octaves: 4,
        lacunarity: 1.9,
        gain: 0.45,
        exponent: 1.1,
        offset: -0.05,
        recordPreWarp: true
      },
      warp: {
        slow: { freq: 0.002, amp: 28 },
        fast: { freq: 0.018, amp: 4 }
      },
      plates: {
        density: 0.0032,
        relaxation: 0.75,
        warpContribution: 0.65,
        ridge: {
          amplitude: 0.55,
          frequency: 0.008,
          octaves: 3,
          lacunarity: 2.0,
          gain: 0.55,
          sharpness: 2.2,
          trenchChance: 0.28,
          trenchMultiplier: 0.65,
          noiseMix: 0.7
        }
      },
      mediumDetail: {
        frequency: 0.03,
        amplitude: 0.18,
        octaves: 3,
        lacunarity: 2.1,
        gain: 0.45,
        coastDampDistance: 0.08,
        coastDampPower: 1.6,
        plateEdgeDampPower: 1.15
      },
      combine: {
        maskWeight: 0.68,
        ridgeWeight: 0.22,
        detailWeight: 0.1,
        bias: 0.0,
        postExponent: 1.02
      },
      normalization: {
        min: -1.0,
        max: 1.0,
        clamp: true
      },
      ocean: {
        seaLevel: null,
        depthScale: 1.6,
        trenchDepthMultiplier: 1.4
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
