<template>
  <v-card
    class="item-tooltip pa-2"
    elevation="2"
    color="primary"
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
          class="stat-label"
        >
          Capacity
        </v-col>
        <v-col
          cols="6"
          class="stat-value text-right"
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
.item-tooltip {
  z-index: 1;
  pointer-events: auto;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}
.item-tooltip .stat-label {
  white-space: nowrap;
  overflow: visible;
  text-overflow: clip;
}
.item-tooltip .stat-value {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
