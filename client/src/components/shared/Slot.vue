<template>
  <div
    :class="[
        'slot',
        type ? `slot-type-${type}` : '',
        { 'has-item': !!item, 'is-small': small },
    ]"
    :style="slotStyle"
    @dragover.prevent
    @drop.stop="onDrop"
    @click="onClick"
  >
    <template v-if="item">
      <DraggableItem
        :item="item"
        :label="label"
        :source="source || { containerId: null, localIndex: null }"
        v-bind="draggableProps"
      />
    </template>
    <template v-else>
      <div
        class="empty-slot d-flex align-center justify-center"
        role="button"
      >
        <v-icon class="empty-icon">
          {{ icon || mdiClose }}
        </v-icon>
      </div>
    </template>

    <div
      v-if="isDragHighlighted"
      class="drag-highlight"
      aria-hidden="true"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from "vue";
import DraggableItem from "@/components/inventory/DraggableItem.vue";
import { mdiClose } from "@mdi/js";
import dragEventBus from "@/lib/dragEventBus";

const props = defineProps({
  item: { type: Object, default: null },
  label: { type: String, default: null },
  slotId: { type: String, default: null },
  type: { type: String, default: "equipment" },
  small: { type: Boolean, default: false },
  source: { type: Object, default: null },
  width: { type: [Number, String], default: undefined },
  height: { type: [Number, String], default: undefined },
  icon: { type: String, default: null },
});

const emit = defineEmits(["click", "dropped"]);

const isDragHighlighted = ref(false);

const slotStyle = computed(() => {
  const s = { position: "relative", width: "100%", height: "100%" };
  if (props.width !== undefined && props.width !== null) {
    s.width =
      typeof props.width === "number" ? `${props.width}px` : props.width;
  }
  if (props.height !== undefined && props.height !== null) {
    s.height =
      typeof props.height === "number" ? `${props.height}px` : props.height;
  }
  // If this slot represents a pack, cap its visual height unless an explicit
  // height prop was provided by the caller. This prevents the slot from
  // expanding a grid row's height unexpectedly.
  if (
    (props.type === "pack" ||
      String(props.slotId || "")
        .toLowerCase()
        .includes("pack")) &&
    (props.height === undefined || props.height === null)
  ) {
    s.maxHeight = "64px";
    s.minHeight = "0";
    s.overflow = "hidden";
  }
  return s;
});

const draggableProps = computed(() => {
  const out = {};
  if (props.width !== undefined && props.width !== null)
    out.width = props.width;
  if (props.height !== undefined && props.height !== null)
    out.height = props.height;
  return out;
});

function normStr(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function onGlobalDragStart(payload) {
  try {
    if (!payload || !payload.item) return;
    const item = payload.item;
    if (!item.equipmentSlot) return;
    const es = normStr(item.equipmentSlot);
    if (!es) return;
    if (props.type === "pack") {
      if (es.includes("pack")) isDragHighlighted.value = true;
      return;
    }
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
.slot {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  min-height: 64px;
  border: 1px dashed rgba(0, 0, 0, 0.12);
  padding: 0;
  position: relative;
  background: rgba(255, 255, 255, 0.02);
}
.slot.is-small {
  min-height: 48px;
}
.slot .empty-slot {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.slot .empty-icon {
  opacity: 0.12;
  width: 60%;
  height: 60%;
}
.slot .drag-highlight {
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
}
@media (max-width: 640px) {
  .slot-type-pack {
    grid-column: span 1;
  }
}
</style>
