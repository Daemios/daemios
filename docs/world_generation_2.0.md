# Hex World Generation – Fantasy but Plausible, Highly Varied, Mobile-Friendly

**Version:** 2.1  
**Purpose:** Define a deterministic, performant, and visually cohesive method for generating continent-scale, **visually dramatic and varied** terrain on a hex grid.  
Generation prioritizes **map quality first**, with performance as a close second, and is designed to run on phones through scalable settings and player-adjustable clutter density.

---

## Creative Constraints & Palette

### Purpose

Define the creative and technical boundaries for the procedural world generation system to ensure:

- **Fantasy but plausible** worlds with bold terrain variety.
- Deterministic, seed-based generation.
- High variety and replay value before any handcrafted content is added.
- Tuneable biome and terrain rules via config files without code changes.

### Tone & Identity

- **Fantasy Plausibility:** Geographic logic respected but compressed and exaggerated for gameplay variety.
- **Bold Geography:** Strong vertical contrast, but no floating landmasses or implausible shapes in baseline generation.
- **Mixed Origin Story:** Features may have subtle mythical or fantastical influence.

### Technical Constraints

- **Map Quality Priority:** Performance tuned after terrain quality targets are met.
- **Performance Levers:**
  - Player-adjustable clutter density (8 models/tile default, 0–8 range).
  - Aggressive LOD and culling.
- **Generation:** O(1) per tile, typically ≤10 noise reads (can exceed slightly for major quality gain).
- **Determinism:** Pure function of `(seed, q, r)` — internally the generator converts axial `(q, r)` to world Cartesian `(x, z)` and samples noise using those Cartesian coordinates.
- **Client-Side Generation:** Server sends `seed` and locations; client renders terrain locally.
- **Visual Output:** Distinct biome palettes, low-poly clutter, contextual tile patterns.
- **Tuneability:** All biome definitions, rarity weights, palettes in external config (JSON, etc.).

### Biome Palette Philosophy

- **Sprawling List:** Large set of biomes for variety and spice.
- **Rarity Tiers:** Common, Uncommon, Rare.
- **Special Biomes:** Unusual but plausible variants tied to climate/terrain.

### Wonders & Special Regions

- Created by baseline generator, not location system.
- Rare, biome-consistent, fantastical scaling with rarity.
- Blend naturally into parent biomes.

### Exploration Goals

- Biome shifts recognizable at a glance.
- Continent sizes allow multiple regions but avoid trapping players inland.
- Oceans deep and expansive enough to justify traversal mechanics.

---

## Layer 1 – Continents & Oceans (Macro Geography)

### Objectives

- Target **60–65% ocean** coverage, but only 1/3rd (ideally tunable) of the total height budget of the terrain should be under water (i.e. under .33 elevation).
- Large, contiguous continents with believable structure and no noisy jitter in this pass.
- Multi-tier bathymetry for visual depth.
- Tunable, deterministic macro generation.

### Field Stack

1. **Macro Continents:** Low-frequency base noise (FBM/simplex). Goal is to have mostly unattached continents.
2. **Dual Domain Warp:**
   - Warp A: Ultra-low frequency for bending continents.
   - Warp B: Mid-frequency for crenulated coasts.
3. **Plate Field:** Voronoi/cellular; stores cell ID & edge distance.
4. **Shelf/Depth Shaper:** Derived from continental field; no extra reads.

**Noise Budget:** ~4 reads for macro pass.

### Elevation Construction

- Combine continent base, plate edge ridges, basin depressions, and detail noise.
- Apply encapsulation to push oceans down and land up.
- Normalize and apply sea level.

### Sea Level & Bathymetry

- Depth bands: Deep Ocean, Abyss, Slope, Shelf.

### Coastline Quality

- Balanced mix of broad peninsulas and crenulated edges.
- Shelf width varies by plate orientation.

### Plate Archetypes

- Shield Plateau, Rift Basin, Collisional Belt, Island Arc, Floodplain.
- Archetypes bias elevation and later biome selection.

### Tunables

- All major parameters configurable at runtime.

---

## Layer 2 – Mesoscale & Regional Identity

### Purpose

Break up continents into distinct regions with unique relief and biome bias.

### Approach

- Use plate field + 1 extra low-frequency region breakup noise (+1 read).
- Assign regional archetype to each region cell.

### Regional Archetypes

- Megaplain, Badlands, High Plateau, Broken Highlands, Basins, Inland Ridge, Coastal Shelf.
- Archetype influences elevation bias and biome weighting.

### Player Experience

- Regions change feel before biome shifts.
- No flat, monotonous interiors.

---

## Layer 3 – Biome Blending, Palette Distinctness & Clutter Rules

### Purpose

- Smooth biome transitions with ecotones.
- Make each biome visually distinct.
- Convey biome identity through palette and clutter.

### Biome Selection

1. Calculate base weights from elevation, temp, moisture.
2. Apply regional biases.
3. Pick top two candidates.
4. Blend colors and clutter if secondary weight > threshold.

### Ecotones

On-the-fly composites of neighboring biomes:

- Color lerp.
- Mixed clutter sets.

### Palette Distinctness

- Base color, slope tint, microvariation per biome.
- All stored in HSV; normalized for cohesion.

### Clutter Rules

- Default: 8/tile; player-adjustable 0–8.
- Per-biome clutter sets; blended in ecotones.
- Model reuse with palette swaps.

---

## Layer 3.5 – Ground Clutter System

### Purpose

Biome readability and visual richness without heavy geometry.

### Clutter Budget

- Default density: 8/tile.
- Adjustable by player.
- GPU instancing, LOD, culling.

### Asset Guidelines

- Low-poly, single material slot, atlas-compatible.
- Large: 150–300 tris, Medium: 80–200 tris, Small: 20–80 tris.
- Consistent scaling between types.

### Categories & Dimensions

**Trees & Large Flora:** Height 6–10m, canopy width 3–6m.  
**Bushes & Medium Flora:** Height 1–2.5m, width 1–2.5m.  
**Rocks & Terrain Features:** Height 0.5–2m, width 0.5–3m.  
**Specialty Clutter:** Varies by asset; scaled to context.

### Placement Rules

- Per-biome density multipliers.
- Slope checks.
- Ecotone blending (50/50 sets).
- Random yaw, ±15% scale, ±5% hue shift.

### Performance

- Instancing per type/chunk.
- 3 LOD levels: full mesh, simplified, billboard/cull.

---

## Layer 4 – Special & Rare Regions

### Purpose

Rare, biome-consistent subregions with strong visual impact.

### Principles

- Biomes first, plausible placement, rarity configurable.
- Implemented as palette/clutter overrides — no heavy new fields.

### Examples

- Frozen Jungle (snowy tropical highlands).
- Volcanic Seafloor (deep ocean near plate boundaries).
- Glass Desert (crystal-studded dunes).
- Obsidian Flats, Salt Flats, Mushroom Glade, Coral Shelf, Ice Forest.

### Placement

- Eligibility check → shared low-frequency mask → thresholded rarity.
- Neighboring eligible tiles pulled into same region.

### Performance

- +1 noise read total for all specials.
- Palette/clutter swaps only.

---

## Aspirational Goal: Visual Cohesion & Fantasy Push

### Purpose

Tie all layers together into a unified, intentional style.

### Goals

- Cohesive color and shape language.
- Fantasy-first palette with consistent saturation/brightness.
- Readable at all zoom levels.
- Works within hex-grid constraints.

### Palette Cohesion

- Normalize HSV ranges.
- Accent colors for fantasy tone.
- Optional LUT for global grading.

### Shape Language

- Consistent poly density and style across assets.

### Height Exaggeration

- Exaggerate relief for zoomed-out silhouettes; normalize up close.
- Lower snowline for visual drama.

### Atmosphere & Shading

- Simple biome-tinted fog gradient.
- Slope tint for cliffs.
- Fixed sun angle for shadow readability.

### Clutter Integration

- Consistent scaling across biomes.
- Color grading applies equally to clutter and ground.

### Configurable Global Style

```json
"visual_style": {
  "global_saturation": 1.15,
  "global_contrast": 1.10,
  "fog_strength": 0.4,
  "mountain_exaggeration": 1.5,
  "snowline_bias": -0.08
}
```
