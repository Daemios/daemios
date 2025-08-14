<template>
  <div
    class="d-flex flex-column text-white py-2 px-3 rounded text-caption"
    style="background: rgba(0,0,0,0.55); min-width: 240px; max-width: 320px; line-height: 1.35;"
  >
    <div class="text-h6 mb-2" style="font-size: 16px; font-weight: 600; letter-spacing: 0.5px;">
      Current Tile
    </div>
    <div class="mb-2">
      <strong>Coordinates:</strong> {{ tile?.q ?? 'N/A' }}, {{ tile?.r ?? 'N/A' }}
    </div>
    <div class="mb-2">
      <strong>Seed:</strong> {{ seed ?? 'N/A' }}
    </div>
    <div class="mb-2">
      <strong>Elevation:</strong> {{ tile?.elevation ?? 'N/A' }} <span v-if="tile?.elevationBand">({{ tile.elevationBand }})</span>
    </div>
    <div class="mb-2">
      <strong>Biome:</strong> {{ tile?.biome ?? 'N/A' }}<span v-if="tile?.biomeBlend"> / {{ tile.biomeBlend }}</span> <span v-if="!tile?.biome">(Not implemented)</span>
    </div>
    <div class="mb-2">
      <strong>Region/Plate Archetype:</strong> {{ tile?.archetype ?? '(Not implemented)' }}
    </div>
    <div class="mb-2">
      <strong>Climate:</strong> Temp: {{ tile?.temperature ?? '(Not implemented)' }}, Moisture: {{ tile?.moisture ?? '(Not implemented)' }}
    </div>
    <div class="mb-2">
      <strong>Clutter:</strong> Density: {{ tile?.clutterDensity ?? '(Not implemented)' }}, Type(s): {{ tile?.clutterTypes ?? '(Not implemented)' }}
    </div>
    <div class="mb-2">
      <strong>Palette:</strong> HSV: {{ tile?.paletteHSV ?? '(Not implemented)' }}, Slope Tint: {{ tile?.slopeTint ?? '(Not implemented)' }}, Microvariation: {{ tile?.microvariation ?? '(Not implemented)' }}
    </div>
    <div class="mb-2">
      <strong>Special Region:</strong> {{ tile?.specialRegion ?? '(Not implemented)' }}
    </div>
    <div class="mb-2">
      <strong>Visual Style:</strong> {{ tile?.visualStyle ?? '(Not implemented)' }}
    </div>
  </div>
</template>

<script setup>
defineProps({
  tile: { type: Object, default: () => ({}) },
  seed: { type: [String, Number], default: null },
});
</script>

<!--
Usage:
<TileInfoPanel :tile="selectedTile" :seed="worldSeed" />
Pass all available tile data as props. If a field is not implemented, it will show '(Not implemented)'.
-->
