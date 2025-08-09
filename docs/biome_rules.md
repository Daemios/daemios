Hex World Generation – Mobile-Friendly Realistic Terrain
Version: 1.0
Purpose: Define the high-level design for generating continent-scale, realistic terrain and biomes on a hex grid, optimized for mobile devices.

1. Overview
   This document describes a deterministic, stateless, and mobile-friendly approach to generating an infinite, realistic-feeling world map for a fantasy game.
   The generator produces large-scale continental geography with climate-driven biomes while keeping compute cost low enough for phones (~8–10 noise lookups per hex).
   This system prioritizes realism over randomness and coherent macro features over “interesting but chaotic” noise patterns.

2. Constraints
   Stateless: Every hex is a pure function of (seed, q, r); no saved map data.

Performance: O(1) per hex, ~8–10 noise lookups total.

Platform: Must run on phones without stalling.

Scope: No rivers (yet). Optional lakes allowed but rare.

Scale: One hex ≈ one city footprint — regions must feel continent-sized.

Look & Feel: Realistic coasts, mountain chains, climate zones, deserts, and forests.

3. Generator Pipeline
   The generation process runs in this strict order for every hex:

Step 1 – Macro Scaffold
Three low-frequency fields define the world’s large-scale structure:

Continental Mask: Very low frequency, domain-warped by an even lower-frequency field. Defines land vs. ocean and broad coastlines.

Plate/Cell Field: Low-frequency cellular/Voronoi noise representing tectonic plates.

Distance to cell edges: Drives mountain belts.

Cell ID: Stable label for regional archetypes and large biome continuity.

Ridge Term: Ridged (absolute value) noise, scaled up near plate edges, to form long mountain ranges.

Add low-amplitude detail noise (1–2 octaves) to roughen features and break uniformity.

Step 2 – Elevation & Bands
Combine:
Elevation = continental base + ridge term + small detail

Classify into elevationBand:

DeepOcean: E < 0.06

Shelf: 0.06–0.09

Coast: 0.09–0.20

Lowland: 0.20–0.50

Highland: 0.50–0.75

Mountain: 0.75–0.90

Peak: ≥ 0.90

Include bathymetry steps within the Shelf for coastal realism.

Step 3 – Climate Fields
Calculate climate analytically:

Temperature: Based on seed-rotated latitude minus altitude lapse.

Wind Bands: Simple lookup by latitude (trade/westerly/polar).

Moisture Proxy: Maritime vs. continental distance from the continental mask.

Rain Shadow: Increase moisture on windward slopes; decrease on leeward slopes, using wind direction vs. slope sign.

Classify:

temperatureBand ∈ {Polar, Cold, Temperate, Tropical}

moistureBand ∈ {Arid, SemiArid, Humid, Saturated}

Step 4 – Regional Archetype
Assign each plate/cell ID one of six archetypes, which bias biome thresholds:

EquatorialWet (+moisture, +temp)

SubtropicalDryWest (–moisture, strong rain shadow)

SubtropicalMonsoonEast (seasonal +moisture east coasts)

TemperateMaritime (mild temps, wet coasts, bogs)

TemperateContinental (drier interiors, strong seasons)

BorealPolar (cold, taiga/tundra/ice)

Step 5 – Biome Selection
Biome choice is based on:

Elevation Band (primary gate)

Temperature × Moisture (climate grid)

Modified by:

Regional archetype bias

Rain shadow

Slope/relief (alpine/badlands)

Examples:

Tropical Lowland: Rainforest (humid+), Seasonal Forest (mid), Savanna (semi-arid), Desert Fringe (arid/leeward).

Temperate Lowland: Broadleaf/Mixed Forest (humid), Grassland/Prairie (mid), Steppe/Shrubland (semi-arid), Cold Desert (arid/continental).

Cold Lowland: Taiga (mid+), Boreal Wetland/Bog (humid, low slope), Cold Steppe/Polar Desert (dry).

Mountains/Peaks: Alpine Meadow (gentle slope, moist), Bare Rock/Scree (steep), Snow/Glacier (cold).

Step 6 – Special Overrides (Sparse, high-impact)
Certain hexes override biome choice when flagged:

Volcanic Province: Lava Fields, Ash Plains, Obsidian Desert, Geothermal Basins.

Salt Flats: Arid basins in warm interiors.

Badlands: Dry, high relief + slope in temperate/continental zones.

Karst: Humid, moderate slope/relief.

Fjord: Cold coasts with steep relief.

Mangrove: Tropical, humid, low-slope coasts.

Step 7 – Sub-Biome Variants
Variants add variety within each major biome:

Desert: Erg Dunes, Gravel Plains, Rocky Mesa, Volcanic Desert.

Forest: Deciduous, Mixed, Conifer, Cloud Forest.

Grassland: Savanna, Prairie, Steppe, Páramo.

Wetlands: Marsh, Bog/Peat, Tundra Wet Flats.

Alpine: Montane Forest → Subalpine → Alpine Meadow → Bare Rock → Snow/Glacier.

Coasts: Sandy, Rocky, Fjord, Mangrove.

Step 8 – Region Coherence
No speckle: Use plate/cell ID to keep biomes contiguous; snap ties to region’s favored biome family.

Soft transitions: 2–5 hex ecotones for gradual blending.

Target scale: Major biomes ≥ 100–300 hex diameter.

Step 9 – Lakes
Appear only where a basinness proxy is true (low slope, below broad-scale elevation).

Surround humid lakes with marsh/bog; arid basins with salt pans.

Rare and region-scale.

Step 10 – Visual Hints for Renderer
Bathymetry steps in Shelf zones.

Aridity-based hue shift.

Altitude desaturation and slope-based rock tint for mountains.

Snow line from temperature/elevation.

4. Noise & Math Budget
   Target per hex:

Continental base: 2–3 lookups

Domain warp: 1

Cellular plates: 1

Ridge term: 1–2

Detail noise: 1–2

Climate & rain shadow: arithmetic or reused samples
Total: ≈ 8–10 noise reads.

5. Invariants
   Deterministic from (seed, q, r).

No neighbor loops or global passes.

No rivers (yet); lakes optional.

Large, coherent regions with natural transitions.

Special features sparse and memorable.
