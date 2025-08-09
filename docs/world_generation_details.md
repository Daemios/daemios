# Hex World Generation – Mobile-Friendly, Interesting Terrain

**Version:** 1.1  
**Purpose:** Define a deterministic, performant method for generating continent-scale, **visually dramatic and varied** terrain on a hex grid.

---

## 1. Overview

This design creates a world that is **highly varied and visually striking**, prioritizing dramatic elevation and biome contrasts over strict geographic realism.  
Maps will feature **bold continental outlines, deeper oceans, taller mountain chains, rift valleys, volcanic provinces, and colorful biomes** that make exploration enticing. Continental interiors trend drier (stronger deserts), coasts trend wetter, and rain‑shadow contrasts are pronounced.

---

## 2. Constraints

- **Stateless:** Every hex is a pure function of `(seed, q, r)`.
- **Performance:** O(1) per hex, ~8–10 noise lookups total.
- **Platform:** Must run smoothly on phones.
- **Scope:** No rivers for now. Lakes allowed but rare and dramatic.
- **Scale:** One hex ≈ one city footprint.
- **Look & Feel:** Big geographic variety, strong region identity, and visible landmarks.

---

## 3. Generator Pipeline

### Step 1 – Macro Scaffold (Big, Bold Shapes)

Generate three core fields:

1. **Continental Mask**

   - Very low frequency base field.
   - Domain-warped strongly by an even lower-frequency field.
   - Use **high amplitude** so land and ocean separation is clear: more true deep ocean, more inland landmass.
   - Push continental interiors higher, ocean basins lower for **vertical contrast**.

2. **Plate/Cell Field**

   - Low-frequency cellular/Voronoi noise.
   - **Distance to plate edges** → Mountain belts (sharper, higher).
   - **Cell ID** → Region labels for biome cohesion.

3. **Ridge Term**
   - Ridged/absolute noise with **increased amplitude** near plate edges.
   - Use some **non-parallel warps** to create curved mountain arcs and rift valleys.

Add **medium-frequency detail noise** to break up flat expanses and create isolated hills and plateaus.

---

### Step 2 – Elevation & Bands

**Elevation = continental base + exaggerated ridge term + medium detail noise.**

Classify into `elevationBand`:

- **DeepOcean:** < 0.05 (very deep basins)
- **Ocean:** 0.05–0.08 (open sea)
- **Shelf:** 0.08–0.12 (wide, shallow seas)
- **Coast:** 0.12–0.20 (rugged or sandy)
- **Lowland:** 0.20–0.45 (plains, forests, deserts)
- **Highland:** 0.45–0.70 (hills, plateaus)
- **Mountain:** 0.70–0.88 (rugged, steep)
- **Peak:** ≥ 0.88 (towering peaks, ice caps)

---

### Step 3 – Climate Fields (Contrasty & Interesting)

- **Temperature:** Latitude + exaggerated altitude lapse for more snow caps and hot lowlands.
- **Wind Bands:** Standard by latitude.
- **Wind Bands:** Standard by latitude with smooth transitions between trades, westerlies, and polar easterlies (no hard seams).
- **Moisture:** Maritime vs. continental with accentuated interior dryness + **stronger rain-shadow effect** for extreme wet/dry boundaries.
  A gentle latitude warp avoids visible straight belt edges.
- **Special Bias Zones:** Every few macro cells, inject “odd” climates (oasis belts, inverted climates) for surprise regions.

Classify:

- `temperatureBand`: Polar, Cold, Temperate, Tropical
- `moistureBand`: Arid, SemiArid, Humid, Saturated

---

### Step 4 – Regional Archetype (Bold Themes)

From `plate/cell ID`, assign an archetype with **more extreme biases**:

- **Tropical Jungle Core** (very wet, hot, lush)
- **Desert Wastes** (arid, warm or hot)
- **Broken Highlands** (rugged, cooler, alpine transitions)
- **Volcanic Arc** (volcanic overrides frequent)
- **Shattered Coast** (fjords, islands, and bays)
- **Frozen Shield** (cold, glaciated, tundra)

These archetypes strongly push biome outcomes so neighboring regions feel distinct.

---

### Step 5 – Biome Selection

Gate by `elevationBand` first, then `temperature × moisture`, modified by:

- Archetype bias
- Rain shadow
- Slope/relief

**Lowland / Highland examples:**

- Tropical: Rainforest, Seasonal Forest, Savanna, Desert Fringe
- Temperate: Mixed Forest, Grassland, Steppe, Arid Basin
- Cold: Taiga, Boreal Wetland, Cold Steppe, Polar Desert
- Polar: Tundra, Ice Sheet

**Mountain / Peak:**

- Alpine Meadow, Bare Rock, Snow/Glacier

**Ocean / Shelf / Coast:**

- Deep Ocean, Open Sea, Coral Sea, Kelp Shelf, Sandy Coast, Rocky Coast, Fjord, Mangrove

---

### Step 6 – Special Overrides (More Frequent)

- Volcanic Province: Lava fields, ash plains, obsidian flats.
- Rift Valley: Deep trench flanked by high ridges.
- Salt Flats: Arid basin floors.
- Badlands: Dry, eroded, high relief.
- Giant Plateau: High, flat-topped landmass.
- Mangrove: Tropical, humid coasts.

---

### Step 7 – Sub-Biome Variants

Choose variant per major biome using slope, relief, and archetype:

- Deserts: Erg Dunes, Stony Desert, Volcanic Desert
- Forests: Rainforest, Cloud Forest, Deciduous, Mixed, Conifer
- Grasslands: Savanna, Prairie, Steppe, Alpine Grass
- Alpine: Montane Forest, Subalpine, Alpine Meadow, Scree, Snow

---

### Step 8 – Region Coherence

- Use `plate/cell ID` for biome cohesion.
- Keep major regions ≥ 80–200 hex diameter.
- Blend between major biome boundaries over 2–4 hexes.

---

### Step 9 – Lakes

- Rare but **dramatic**: very large inland seas, crater lakes, or chains of highland tarns.
- Surround humid lakes with marsh; arid lakes with salt flats.

---

### Step 10 – Visual Hints

- Bathymetry gradients for ocean depth.
- Bright volcanic colors for lava/ash.
- Strong color contrasts between arid and humid regions.
- Snow line lowered for dramatic alpine regions, with a moisture-aware snow mask (arid cold = sparse snow; humid cold = heavy snow; peaks remain snowy).

---

## 4. Noise/Math Budget

- Continental base: 2–3 reads
- Domain warp: 1
- Cellular plates: 1
- Ridge term: 1–2
- Medium detail noise: 1–2
- Climate: arithmetic or reuse samples
  **Total:** ~8–10 noise lookups per hex.

---

## 5. Invariants

- Deterministic from `(seed, q, r)`.
- No neighbor loops or global passes.
- No rivers for now.
- Large, varied, and memorable landforms.
- Special features occur more frequently than in realism mode.

---

## 6. Debug Tuning Controls (runtime)

For iteration and validation, the generation debug panel exposes scale multipliers that adjust sampling scales at runtime without changing determinism for a given seed and inputs:

- Continent: multiplies the continental base frequency (bigger number → smaller continents; smaller → larger continents/oceans)
- Warp: multiplies the domain-warp frequency (bigger → more wiggly coasts)
- Warp strength: multiplies the warp amplitude (bigger → stronger coastline distortion)
- Plate size: multiplies tectonic cell size (bigger → larger regions/mountain arcs)
- Ridge: multiplies ridge noise frequency (bigger → more, tighter mountain chains)
- Detail: multiplies mid‑frequency detail (bigger → more breakup of flats)
- Climate belt: multiplies latitude period (bigger → wider climate bands)
- Ocean encapsulation: 0..1 strength; pushes oceans down and land up using the continental mask for true surrounding oceans (default ~0.75)
- Sea bias: shifts sea level globally; positive increases ocean coverage (target ~0.0; try 0.08–0.18 for ~50% ocean if your seed yields land-heavy worlds)

All default to 1.0. Values are uncapped; extreme values may produce stylized outputs. Changes are applied live to the visible chunk neighborhood.
