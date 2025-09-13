# Hex World Generation – Technical Specification

**Version:** 2.0  
**Purpose:** Define the technical implementation details for the procedural hex world generation system.  
**Scope:** Server/client integration, data flow, algorithmic layers, performance targets, configuration structure, and extensibility.

---

## **0. System Overview**

### **Architecture**

- **Deterministic Generation:** Every tile is a pure function of `(seed, q, r)`.
- **Client-Side Generation:**
  - Server sends world `seed` + list of **locations** in render range.
  - Client uses seed + coordinates to generate base terrain.
  - Locations override base tiles as needed (for dungeons, POIs, etc.).
- **Performance Target:**
  - O(1) time per tile.
  - ≤10 noise reads per tile on default settings; slightly higher allowed if quality gain is significant.
  - All features must be scalable for mobile clients.

---

## **1. Data Flow**

```
Server:
  - Sends (seed, player_position, locations_in_range)

Client:
  1. For each visible hex (q, r):
     - Generate macro geography (Layer 1)
     - Apply mesoscale regional variation (Layer 2)
     - Select biome + blending (Layer 3)
     - Place clutter assets (Layer 3.5)
     - Apply special/rare region overrides (Layer 4)
     - Apply global visual adjustments (Layer 5)
  2. Render using low-poly tiles + clutter + shaders
```

---

## **2. Noise & Math Budget**

- **Shared Noise Sources:**

  - **Low-frequency continental mask** (FBM/simplex)
  - **Warp fields** (slow & fast)
  - **Plate Voronoi**
  - **Medium detail noise**
  - **Region breakup noise**
  - **Special region mask**

- **Target:**  
  | Layer | Reads | Notes |
  |---------|-------|-------|
  | Layer 1 | 5–6 | Includes warps, plates, macro, detail |
  | Layer 2 | +1 | Region breakup noise |
  | Layer 4 | +1 | Shared special region mask |
  | Total | 7–8 | Leaves headroom for climate fields |

---

## **3. Configuration System**

- **Format:** JSON
- **Load:** At runtime; reloadable for tuning without recompilation.
- **Categories:**
  - Macro geography (`macro`, `warp`, `plates`, `detail`, `archipelago`)
  - Region archetypes
  - Biomes (base palettes, clutter sets)
  - Clutter assets (dimensions, poly budget, palette variants)
  - Special/rare regions
  - Visual style parameters

**Example:**

```json
{
  "macro": { "ocean_target_pct": 0.62, "sea_level": 0.52 },
  "warp": { "slow": { "freq": 0.08, "amp": 0.25 } },
  "plates": { "freq": 0.1, "ridge_amp": 0.45 },
  "detail": { "freq": 0.6, "amp": 0.15 }
}
```

---

## **4. Layer Implementation**

### **Layer 1 – Continents & Oceans**

**Purpose:** Generate macro-scale land/ocean distribution, major ridges, and bathymetry.

**Algorithm:**

1. Warp coordinates:
   ```
   pw = p + warpA(p) * A_amp + warpB(p) * B_amp
   ```
2. Continental mask:
   ```
   C0 = fbm(seed+3, pw, lf)
   ```
3. Plate Voronoi:
   - Store `cellId` and `distanceToEdge`.
4. Ridge/Basin shaping:
   - Ridge: `ridgeShape(distanceToEdge)`
   - Basin: `basinShape(distanceToCenter)`
5. Add medium detail noise to break uniformity.
6. Encapsulation:
   - Push oceans down, land up using `C0` as mask.
7. Normalize and apply sea level threshold.

---

### **Layer 2 – Mesoscale & Regional Identity**

**Purpose:** Break continents into smaller, distinct regions.

**Algorithm:**

1. Region breakup noise (low-frequency cellular) generates subregions within plates.
2. Assign regional archetype by weighted random per region cell.
3. Apply elevation/relief bias from archetype:
   - Megaplain: flatten toward slightly-above sea level.
   - Badlands: add medium relief.
   - High Plateau: raise elevation.
   - etc.
4. Store biome weight multipliers for Layer 3.

---

### **Layer 3 – Biome Blending & Palette**

**Purpose:** Assign biome per tile and create smooth transitions.

**Algorithm:**

1. Compute base biome weights from `(elevation_band, temperature, moisture)`.
2. Apply regional archetype bias.
3. Select top 2 candidates.
4. Blend if secondary weight > threshold:
   ```
   final_color = lerp(primary.color, secondary.color, blend_factor)
   final_clutter = mixSets(primary.clutter, secondary.clutter)
   ```
5. Store biome assignment + blend factor for rendering.

---

### **Layer 3.5 – Ground Clutter**

**Purpose:** Add low-poly biome-specific clutter for visual identity.

**Rules:**

- Per-biome clutter sets.
- Placement respects slope limits (flora only).
- Ecotone zones mix clutter from both parents.
- Variance in rotation, scale, hue.

**Performance:**

- GPU instancing; one draw call per clutter type per chunk.
- LOD levels:
  - LOD0: full mesh
  - LOD1: simplified mesh (~50% tris)
  - LOD2: billboard impostor or culled

---

### **Layer 4 – Special & Rare Regions**

**Purpose:** Add rare subregions within biomes.

**Algorithm:**

1. Check if tile biome + climate match special region rules.
2. Sample special region mask; compare to rarity threshold.
3. If eligible, expand to neighbors (1–3 hex radius).
4. Apply palette/clutter overrides.

**Performance:**

- One shared noise mask for all specials.

---

### **Layer 5 – Visual Cohesion & Style**

**Purpose:** Apply global adjustments to unify look.

**Implementation:**

- Palette normalization (global saturation/contrast).
- Snowline bias applied to high elevations.
- Fog gradient by biome moisture/temperature.
- Height exaggeration scaling by zoom.
- Slope tint application for elevation contrast.

---

## **5. Climate Fields**

- **Temperature:** Derived from latitude + altitude lapse rate.
- **Moisture:** Based on ocean proximity, plate orientation, rain shadow from ridges.
- **Wind bands:** Latitudinal; smoothed to avoid seams.

---

## **6. Elevation Bands**

For biome and visual classification:

- DeepOcean, Abyss, Slope, Shelf
- Coast, Lowland, Highland, Mountain, Peak

---

## **7. Performance Considerations**

- **Noise Optimization:** Reuse values where possible; avoid resampling same field.
- **Memory:** No tile caching; stateless per tile generation.
- **GPU:** Batch clutter instances by type; share materials via atlas.
- **Client Scaling:** Allow clutter density scaling, LOD distances adjustment, and disabling advanced shading.

---

## **8. Extensibility**

- **Adding New Biomes:** Update config with palette, clutter set, climate rules.
- **Adding Special Regions:** Define biome compatibility, rarity, palette/clutter overrides.
- **Changing Geography:** Adjust macro/plate config frequencies and amplitudes.

---

## **9. Server/Client Integration**

- **Server:**
  - Holds authoritative location data.
  - Sends `seed` and locations in render range.
- **Client:**
  - Generates base terrain from seed locally.
  - Overlays locations on base terrain.
  - Renders result with clutter and visual adjustments.

---

## **10. Debug & Tuning Tools**

- **Runtime Debug Panel:**
  - Sliders for continent size, warp frequency, ridge amplitude, climate band width, sea level, encapsulation strength.
  - Changes apply live without affecting determinism for current `(seed, q, r)`.

---

## **11. Key Constants**

- Default ocean coverage: `0.62`
- Max inland distance: `100` tiles (runtime configurable)
- Clutter density default: `8` models/tile
- Noise reads target: ≤10 per tile
