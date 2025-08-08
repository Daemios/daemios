# Biome & Color Rules

This document specifies how hex tiles are currently classified into biomes and colored in the world map renderer.

Version: 1.0
Last Updated: (auto)

## Inputs

For each axial hex coordinate (q,r):

- Shaped elevation `h` in [0,1] (post noise shaping & exponents)
- Moisture `m` in [0,1]
- Temperature `t` in [0,1]

## Elevation Bands (Primary Biome)

Elevation determines the base biome first; moisture only controls greenness (NOT water level). Water bands squashed to increase land.

| Band | Range (h)       | Biome         | Notes                              |
| ---- | --------------- | ------------- | ---------------------------------- |
| 1    | h < 0.06        | Deep Water    | Very small deepest basins          |
| 2    | 0.06 ≤ h < 0.09 | Shallow Water | Thin coastal fringe                |
| 3    | 0.09 ≤ h < 0.20 | Beach         | Sand → early vegetation transition |
| 4    | 0.20 ≤ h < 0.66 | Lowland       | Expanded plains band               |
| 5    | 0.66 ≤ h < 0.86 | Highland      | Elevated vegetated terrain         |
| 6    | 0.86 ≤ h < 0.95 | Mountain      | Rock heading to snow               |
| 7    | h ≥ 0.95        | Snow Cap      | Permanent snow                     |

## Base Palette

- Deep Water: #143d59
- Shallow Water: #2f6fa5
- Beach: #d8c9a6
- Lowland: #5fae4d
- Highland: #6e8f5e
- Mountain: #b7b7b7
- Snow: #f5f5f5

Gradient transitions occur via `Color.lerp()` between adjacent band colors using normalized local fraction within the band; some transitions (e.g., lowland→highland, highland→mountain) apply easing (`Math.pow(f, power)`).

## Foliage Bands (replaces Moisture)

Foliage `f` represents vegetation density distribution: desert (<0.33), plains (0.33–0.66), forest (>0.66). It controls greenness only (not sea level). Applied on land with band-based strengths.
Result: Dry areas trend tan/desert; mid values plains-green; lush areas deeper green.

## Temperature Modulation (Simplified)

Temperature only affects the coldest 10% (t ∈ [0,0.1]):

- At t=0: desaturate 40%, lighten +0.08
- At t=0.1: no change
  For t > 0.1 there is currently no temperature-based color adjustment.

## Design Rationale

1. Elevation-first ensures water only occupies genuine basins.
2. Narrow shallow-water & beach bands create coastal definition.
3. Plains (0.30–0.60) wide to encourage settlements/gameplay.
4. Moisture & temperature remain secondary so extreme climates do not override geography.
5. Snow cap reserved for extreme elevations to maintain visual hierarchy.
6. Moisture clearly communicates biome dryness (desert ↔ forest) without implying sea level.

## Minimum Land Height Clamp

Soft floor system (replaces hard clamp):

1. Deep & shallow water: never raised; preserve basin depth.
2. Shore transition (shallowWater_threshold .. + shorelineBlend): smoothstep blend from raw pillar height toward the nominal minimum land height (minLand) so beaches slope gently instead of forming walls.
3. Interior land (above blend zone) that still falls below minLand is eased upward 85% of the deficit (retains subtle micro-variation instead of a perfectly flat plane).
4. Raw (unfloored) elevation stored per tile for future simulation / hydrology.

Parameters:

- minLand = 0.32 (visual pillar y-scale lower bound target for land)
- shorelineBlend = 0.08 (elevation span after shallow water upper bound over which we blend)
  Algorithm uses smoothstep(t)=t^2(3-2t) for shoreline easing.

## Secondary Water Mask Pass

After base elevation and foliage assignment, an independent low-frequency noise mask reduces elevations locally to form inland water (lakes/rivers). Visual biome/color is re-evaluated from the post-mask elevation so masked basins appear as water without altering global sea level bands.

## Grid Resolution

World map grid size doubled while individual hex radius halved, yielding higher spatial resolution without expanding footprint.

## Future Extensions (Planned)

- Add desert biome for hot + dry lowlands (conditional override)
- Add swamp biome for low elevation + high moisture
- Seasonal hue shifts (temperature/season input)
- Explicit water surface mesh generation referencing rawHeight for lakes.

## Implementation Location

Logic is implemented in `src/terrain/biomes.js` (to be created) and consumed by `WorldMap.vue`.
