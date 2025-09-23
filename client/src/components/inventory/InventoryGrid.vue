<template>
  <div class="inventory-grid-root">
    <div class="inventory-grid">
      <div
        v-for="slot in slots"
        :key="slot.globalIndex"
        class="inventory-slot"
        :class="{ highlighted: slot.containerId === highlightedContainerId }"
        @click="() => $emit('click-item', slot.item)"
        @dragover.prevent
        @drop="onDrop($event, slot)"
      >
        <div v-if="slot.item" class="slot-item">
          <DraggableItem
            :item="slot.item"
            :label="slot.item.name"
            :source="{
              containerId: slot.containerId,
              localIndex: slot.localIndex,
            }"
            :width="'100%'"
            :height="'100%'"
          />
        </div>
        <div v-else class="slot-empty">&nbsp;</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import DraggableItem from "@/components/inventory/DraggableItem.vue";
import { computed } from "vue";

const emit = defineEmits(["click-item", "move-item"]);

const props = defineProps({
  // accept an array of containers to render as a unified grid
  containers: {
    type: Array,
    default: () => [],
  },
  // id of the container to highlight (hovered in parent)
  highlightedContainerId: {
    type: [String, Number, null],
    default: null,
  },
});

// Build a unified slots array combining containers in order. Each slot
// includes: globalIndex, containerId, localIndex, and item (or null).
const slots = computed(() => {
  const out = [];
  let global = 0;
  (props.containers || []).forEach((c) => {
    const capacity = c?.capacity || 0;
    const itemsByIndex = {};
    (c?.items || []).forEach((it) => {
      if (typeof it.containerIndex === "number")
        itemsByIndex[it.containerIndex] = it;
    });

    for (let i = 0; i < Math.max(capacity, 1); i++) {
      out.push({
        globalIndex: global++,
        containerId: c.id,
        localIndex: i,
        item: itemsByIndex[i] || null,
      });
    }
  });

  // ensure at least one slot for empty
  if (out.length === 0)
    out.push({ globalIndex: 0, containerId: null, localIndex: 0, item: null });
  return out;
});

function onDrop(e, slot) {
  try {
    const raw = e.dataTransfer.getData("application/json");
    if (!raw) return;
    const payload = JSON.parse(raw);
    // payload expected: { type: 'item', item: {...}, source: { containerId, localIndex } }
    if (payload && payload.type === "item") {
      const target = {
        containerId: slot.containerId,
        localIndex: slot.localIndex,
      };
      // emit move-item so parent can handle the actual swap/move
      emit("move-item", { item: payload.item, source: payload.source, target });
    }
  } catch (err) {
    console.warn("drop parse failed", err);
  }
}
</script>

<style scoped>
.inventory-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(64px, 1fr));
  gap: 6px;
}
.inventory-slot {
  border: 1px dashed rgba(0, 0, 0, 0.12);
  min-height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.02);
  padding: 0;
}
.inventory-slot.highlighted {
  outline: 2px solid rgba(33, 150, 243, 0.5);
  background: rgba(33, 150, 243, 0.06);
}
.slot-item img {
  max-width: 100%;
  max-height: 36px;
  display: block;
  margin: 0 auto;
}
.slot-item {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.item-name {
  font-size: 0.75rem;
  text-align: center;
}
.item-qty {
  font-size: 0.7rem;
  text-align: center;
}
.slot-empty {
  opacity: 0.25;
}
</style>
