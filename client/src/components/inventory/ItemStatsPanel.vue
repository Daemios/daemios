<template>
  <v-card
    class="item-stats-panel pa-2"
    elevation="2"
    style="min-width: 160px"
  >
    <v-card-title
      class="py-1"
      style="font-size: 14px; font-weight: 600"
    >
      {{ itemName }}
    </v-card-title>
    <v-card-text class="py-1">
      <v-row
        align="center"
        class="py-0"
      >
        <v-col
          cols="6"
          class="text--secondary"
          style="font-size: 12px"
        >
          Capacity
        </v-col>
        <v-col
          cols="6"
          class="text-right"
          style="font-weight: 600"
        >
          {{ capacityDisplay }}
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { computed } from "vue";
const props = defineProps({
  item: { type: Object, required: true },
});

const itemName = computed(
  () => props.item && (props.item.label || props.item.name || "Unknown")
);

// Capacity: prefer an explicit capacity on the item, otherwise fall back to container.capacity
const capacityDisplay = computed(() => {
  if (!props.item) return "-";
  if (props.item.capacity != null) return String(props.item.capacity);
  if (props.item.container && props.item.container.capacity != null)
    return String(props.item.container.capacity);
  // some server responses embed container fields directly on the item
  if (props.item.containerCapacity != null)
    return String(props.item.containerCapacity);
  return "-";
});
</script>

<style scoped>
/* Minor spacing tweaks; Vuetify handles most styling */
.v-card {
  pointer-events: auto;
}
/* Prevent stat labels from wrapping */
.item-stats-panel .v-col,
.item-stats-panel .v-col .text--secondary,
.item-stats-panel .v-col.text--secondary {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.item-stats-panel .v-col.text-right {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
