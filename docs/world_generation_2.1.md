# Hex World Generation – Technical Specification

**Version:** 2.1 (Hybrid Biome–Relief)

**Purpose:** Update v2.0 with a hybrid approach that preserves global drama (plates, ridges, macro elevation) while allowing biomes to shape micro‑relief and selection probabilities without creating circular dependencies.

**Scope:** Server/client integration, data flow, algorithmic layers, performance targets, configuration structure, and extensibility.

---

## 0. System Overview

### Architecture

- Deterministic Generation: Every tile is a pure function of (seed, q, r).
- Client-Side Generation:
  - Server sends world seed + list of locations in render range.
  - Client uses seed + coordinates to generate base terrain.
  - Locations override base tiles as needed (for dungeons, POIs, etc.).
- Performance Target:
  - O(1) time per tile.
  - ≤10 noise reads per tile on default settings; slightly higher allowed if quality gain is significant.
  - All features must be scalable for mobile clients.

### High‑Level Per‑Hex Flow
1. Layer 1: Continents, plates, ridges, macro elevation fields.
2. Layer 2: Mesoscale regional identity (archetype) without overwriting macro drama.
3. Relief Index (new shared field): Compute once; biome‑independent 0–1 flat→rough measure.
4. Climate: Temperature & moisture from latitude, altitude lapse, ocean proximity, rain shadow.
5. Layer 3: Biome selection using (elevation band, climate) plus each biome’s probability curve over the Relief Index.
6. Micro‑Relief Decoration: Apply small‑amplitude biome micro‑relief scaled by Relief Index (does not erase macro elevation).
7. Layer 3.5: Clutter placement (biome/ecotone aware).
8. Layer 4: Special/rare region overrides.
9. Layer 5: Visual cohesion pass (palette normalization, fog, snowline bias, height exaggeration by zoom, slope tint).

---

## 1. Data Flow

    Server:
      - Sends (seed, player_position, locations_in_range)

    Client:
      1. For each visible hex (q, r):
         - Generate macro geography (Layer 1)
         - Apply mesoscale regional variation (Layer 2)
         - Compute Relief Index (shared field)
         - Compute climate fields
         - Select biome with Relief-aware probability (Layer 3)
         - Apply biome micro-relief (decoration only)
         - Place clutter assets (Layer 3.5)
         - Apply special/rare region overrides (Layer 4)
         - Apply global visual adjustments (Layer 5)
      2. Render using low-poly tiles + clutter + shaders

---

## 2. Noise & Math Budget

- Shared Noise Sources:
  - Low-frequency continental mask (FBM/simplex)
  - Warp fields (slow & fast)
  - Plate Voronoi (cell id, distance‑to‑edge/center)
  - Medium detail noise
  - Region breakup noise
  - Special region mask
- Relief Index: Computed from existing fields (see §4.3) to avoid new reads.

Target:

| Layer        | Reads | Notes                               |
|--------------|------:|-------------------------------------|
| Layer 1      |   5–6 | Warps, plates, macro, medium detail |
| Layer 2      |    +1 | Region breakup noise                |
| Relief Index |    +0 | Derived; reuse existing fields      |
| Layer 4      |    +1 | Shared special region mask          |
| Total        |  7–8  | Leaves headroom for climate fields  |

---

## 3. Configuration System

- Format: JSON
- Load: At runtime; reloadable for tuning without recompilation.
- Categories:
  - Macro geography (macro, warp, plates, detail, archipelago)
  - Region archetypes
  - Biomes (palettes, clutter sets, probability curves over Relief Index, micro‑relief params)
  - Clutter assets (dimensions, poly budget, palette variants)
  - Special/rare regions
  - Visual style parameters

Example (global):

    {
      "macro": { "ocean_target_pct": 0.62, "sea_level": 0.52 },
      "warp": { "slow": { "freq": 0.08, "amp": 0.25 } },
      "plates": { "freq": 0.1, "ridge_amp": 0.45 },
      "detail": { "freq": 0.6, "amp": 0.15 }
    }

Example (biome schema additions):

    {
      "biomes": {
        "Grassland": {
          "palette": {"example": "..." },
          "clutter": {"example": "..." },
          "probability": {
            "elevation_bands": { "Lowland": 1.0, "Highland": 0.35, "Mountain": 0.05 },
            "relief_curve": [
              { "x": 0.0, "w": 1.0 },
              { "x": 0.4, "w": 0.9 },
              { "x": 0.7, "w": 0.25 },
              { "x": 1.0, "w": 0.1 }
            ]
          },
          "micro_relief": {
            "amp": 0.12,
            "roughness": 0.35,
            "lacunarity": 1.8,
            "slope_bias": -0.2,
            "scale_by_relief_index": 1.0
          }
        },
        "Badlands": {
          "probability": {
            "elevation_bands": { "Lowland": 0.2, "Highland": 0.9, "Mountain": 0.6 },
            "relief_curve": [
              { "x": 0.0, "w": 0.1 },
              { "x": 0.5, "w": 0.6 },
              { "x": 0.8, "w": 1.0 },
              { "x": 1.0, "w": 1.0 }
            ]
          },
          "micro_relief": {
            "amp": 0.45,
            "roughness": 0.75,
            "lacunarity": 2.2,
            "slope_bias": 0.35,
            "scale_by_relief_index": 1.0
          }
        }
      }
    }

---

## 4. Layer Implementation

(Full Layer descriptions, Relief Index, Climate, Biome Selection, Micro‑Relief Decoration, Clutter, Specials, and Visual Cohesion as defined in the hybrid spec.)

---

## 5. Elevation Bands

- DeepOcean, Abyss, Slope, Shelf
- Coast, Lowland, Highland, Mountain, Peak

Policy: Biomes do not hard‑clamp elevation bands. They express preferences via probability curves.

---

## 6. Performance Considerations

- Noise Optimization: Reuse fields wherever possible (warp fields, medium detail, plate distances).
- Relief Index: Derived field; no extra reads.
- Memory: Stateless per tile; no tile caching required.
- GPU: Batch clutter by type; share materials via atlas.
- Client Scaling: Sliders for clutter density, LOD distances, and optional disable of micro‑relief on low-end devices.

---

## 7. Extensibility

- Adding New Biomes: Provide palette, clutter, probability curves, and micro‑relief params.
- Adding Special Regions: Define biome compatibility, rarity, and overrides.
- Changing Geography: Adjust macro/plate configs; Relief Index adapts automatically.

---

## 8. Server/Client Integration

- Server:
  - Holds authoritative location data.
  - Sends seed and locations in render range.
- Client:
  - Generates base terrain from seed locally.
  - Overlays locations on base terrain.
  - Renders result with clutter and visual adjustments.

---

## 9. Debug & Tuning Tools

- Runtime Debug Panel Additions:
  - Relief Index weights: w1 (plate), w2 (medium), w3 (region); exponent k.
  - Biome micro‑relief: amp, roughness, lacunarity, slope_bias, scale_by_relief_index.
  - Blending: threshold for secondary biome, ecotone width.
  - Toggles: show Relief Index, show biome probability response, show micro‑relief only.

---

## 10. Key Constants

- Default ocean coverage: 0.62
- Max inland distance: 100 tiles (runtime configurable)
- Clutter density default: 8 models/tile
- Noise reads target: ≤10 per tile (Relief Index is derived)
