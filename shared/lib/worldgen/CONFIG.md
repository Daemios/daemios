Worldgen config reference

This file documents the important fields in the `DEFAULT_CONFIG` used by the shared world generator.

Fields

- seed: string

  - Global default RNG seed used when callers do not provide one. Can be overridden per-call.

- maxHeight: number

  - Maximum world-space height in world units. Normalized elevations (0..1) are multiplied by this value.

- scale: number

  - Renderer/global scale multiplier applied to final heights.

- heightMagnitude: number

  - Additional renderer-side exaggeration multiplier (legacy tuning).

- layersOrder: array[string]

  - Friendly layer names run in this order by the generator orchestrator.

- layers: object

  - global.seaLevel: number — authoritative sea level used by bathymetry and palette decisions.
  - layer0: palette defaults (paletteId: string)
  - layer1: continents and plates tuning
    - clampAboveSea: number — maximum normalized elevation above sea level allowed for layer1 contributions (clamped at merge time).
    - continentScale: number — multiplier used by continent samplers.
    - warp: object — domain-warp tuning for slow/fast bands.
    - detail: object — small-scale detail tuning.
  - layer3: biome tuning (ecotoneThreshold etc.)
  - layer3_5: clutter tuning (clutterDensity etc.)
  - layer4: special regions tuning (rarityMultiplier etc.)

- visual_style: object
  - global_saturation, global_contrast, fog_strength, mountain_exaggeration, snowline_bias

Notes

- The generator's `cfg` is normalized via `normalizeConfig` before use.
- Per-tile RNG uses the seed from the call-site or falls back to `cfg.seed` if present.
- `clampAboveSea` is applied at merge time to the normalized elevation used for classification and palette decisions.
