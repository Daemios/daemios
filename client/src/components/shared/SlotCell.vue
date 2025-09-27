<template>
  <div
    :class="[
      'slot-cell',
      type ? `slot-type-${type}` : '',
      { 'has-item': !!item, 'is-small': small },
    ]"
    style="position: relative"
    @dragover.prevent
    @drop="onDrop"
    @click="onClick"
  >
    <template v-if="item">
      <DraggableItem
        :item="item"
        :label="label"
        :source="source || { containerId: null, localIndex: null }"
        :width="'100%'"
      />
    </template>
    <template v-else>
      <div class="empty-slot d-flex align-center justify-center" role="button">
        <v-icon class="empty-icon">
          {{ mdiClose }}
        </v-icon>
      </div>
    </template>

    <!-- overlay highlight shown when a dragged item is eligible for this slot -->
    <div v-if="isDragHighlighted" class="drag-highlight" aria-hidden="true" />
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
import DraggableItem from "@/components/inventory/DraggableItem.vue";
import { mdiClose } from "@mdi/js";
import dragEventBus from "@/lib/dragEventBus";

const props = defineProps({
  item: { type: Object, default: null },
  label: { type: String, default: null },
  slotId: { type: String, default: null },
  type: { type: String, default: "equipment" }, // 'equipment' | 'pack' | 'ability'
  small: { type: Boolean, default: false },
  source: { type: Object, default: null },
});

const emit = defineEmits(["click", "dropped"]);

const isDragHighlighted = ref(false);

function normStr(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function onGlobalDragStart(payload) {
  try {
    if (!payload || !payload.item) return;
    const item = payload.item;
    if (!item.equipmentSlot) return; // equipmentSlot authoritative
    const es = normStr(item.equipmentSlot);
    if (!es) return;
    // For pack-type slots, check for 'pack' in equipmentSlot
    if (props.type === "pack") {
      if (es.includes("pack")) isDragHighlighted.value = true;
      return;
    }
    // For ability slots: check if equipmentSlot mentions 'ability' or matches slotId
    if (props.type === "ability") {
      const sid = normStr(props.slotId || "");
      if (
        es.includes("ability") ||
        (sid && (es === sid || es.includes(sid) || sid.includes(es)))
      ) {
        isDragHighlighted.value = true;
      }
      return;
    }
    // default: equipment slot match against slotId
    const sid = normStr(props.slotId || "");
    if (sid && (es === sid || es.includes(sid) || sid.includes(es))) {
      isDragHighlighted.value = true;
    }
  } catch (err) {
    // defensive
  }
}

function onGlobalDragEnd() {
  isDragHighlighted.value = false;
}

onMounted(() => {
  dragEventBus.on("drag-start", onGlobalDragStart);
  dragEventBus.on("drag-end", onGlobalDragEnd);
});

onBeforeUnmount(() => {
  dragEventBus.off("drag-start", onGlobalDragStart);
  dragEventBus.off("drag-end", onGlobalDragEnd);
});

function onDrop(e) {
  try {
    const raw = e.dataTransfer.getData("application/json");
    if (!raw) return;
    const payload = JSON.parse(raw);
    if (!payload || payload.type !== "item") return;
    emit("dropped", {
      payload,
      slot: { slotId: props.slotId, type: props.type },
    });
  } catch (err) {
    // ignore
  }
}

function onClick() {
  emit("click", props.item);
}
</script>

<style scoped>
.slot-cell {
  /* Fill the grid cell fully and use box-sizing so borders/padding don't shrink content */
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  min-height: 64px;
  border: 1px dashed rgba(0, 0, 0, 0.12);
  padding: 0;
  position: relative;
  background: rgba(255, 255, 255, 0.02);
}
.slot-cell.is-small {
  min-height: 48px;
}
.slot-cell .empty-slot {
  /* absolutely fill the parent so the 'empty' visual touches the slot edges */
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.slot-cell .empty-icon {
  opacity: 0.12;
  width: 60%;
  height: 60%;
}
.slot-cell .drag-highlight {
  position: absolute;
  inset: 0;
  border-radius: 6px;
  pointer-events: none;
  box-shadow: inset 0 0 0 4px rgba(33, 150, 243, 0.85),
    inset 0 0 18px rgba(33, 150, 243, 0.35);
  transition: opacity 120ms ease-in-out;
}
.slot-type-pack {
  grid-column: span 2;
  grid-row: span 2;
  min-height: 104px;
}
@media (max-width: 640px) {
  .slot-type-pack {
    grid-column: span 1;
    grid-row: span 1;
    min-height: 96px;
  }
}
</style>
