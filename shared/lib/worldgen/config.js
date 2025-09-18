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
  layersOrder: [ 'continents', 'plates_and_mountains', 'biomes', 'specials', 'visual', 'clutter' ],
  layers: {
    // Global tuning values that affect multiple layers (authoritative sea level)
    global: {
      seaLevel: .20
    },
    layer0: {
      paletteId: 'default'
    },
    layer1: {
      clampAboveSea: 0.01,
      continentScale: 1.0,
      plateCellSize: 256,
      warp: {
        slow: { freq: 0.08, amp: 0.25 },
        fast: { freq: 0.6, amp: 0.05 }
      },
      detail: { freq: 0.6, amp: 0.15 }
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
