<template>
  <div
    :class="dollSlotClasses"
    style="position: relative"
    @dragover.prevent
    @drop="onDrop"
  >
    <template v-if="props.item">
      <DraggableItem
        :item="safeItem"
        :label="label"
        :source="{ equip: true, slot: label, equippedItemId: safeItem.id }"
      />
    </template>
    <template v-else>
      <div
        class="empty-slot d-flex align-center justify-center"
        role="button"
        @click="() => emit('click')"
      >
        <v-icon class="empty-icon">
          {{ mdiClose }}
        </v-icon>
      </div>
    </template>
    <!-- slot name chip at bottom -->
    <div
      v-if="displayLabel"
      style="
        position: absolute;
        bottom: 4px;
        left: 50%;
        transform: translateX(-50%);
      "
    >
      <v-chip
        small
        density="compact"
        elevation="0"
        color="#ffcc00"
        text-color="#000000"
        style="font-size: 10px; padding: 2px 6px; opacity: 0.95"
      >
        {{ displayLabel }}
      </v-chip>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import DraggableItem from "@/components/inventory/DraggableItem.vue";
import { mdiClose } from "@mdi/js";

const props = defineProps({
  item: {
    type: Object,
    default: null,
  },
  label: {
    type: String,
    default: null,
  },
  slotName: {
    type: String,
    default: null,
  },
  left: {
    type: Boolean,
    default: false,
  },
  right: {
    type: Boolean,
    default: false,
  },
});

// consolidated emits
const emit = defineEmits(["click", "equip-item", "invalid-drop"]);

const dollSlotClasses = computed(() => ({
  "doll-left": props.left,
  "doll-right": props.right,
}));

// canonical slot id used for emits and validation (always lowercased)
const slotId = computed(() => {
  const candidate =
    props.slotName || (props.item && props.item.slot) || props.label || "";
  return String(candidate || "").toLowerCase();
});

// keep a `label` binding to minimize changes elsewhere in the codebase
const label = computed(() => slotId.value);

// user-facing chip label: prefer explicit `props.label`, otherwise map known
// slot ids to friendly names
const displayLabel = computed(() => {
  if (props.label) return props.label;
  const s = slotId.value;
  if (!s) return null;
  const map = {
    bandolier: "Trinket",
    backpack: "Backpack",
    belt: "Belt",
    mainhand: "Main Hand",
    offhand: "Off Hand",
    head: "Head",
    shoulders: "Shoulders",
    back: "Back",
    chest: "Chest",
    hands: "Hands",
    waist: "Waist",
    legs: "Legs",
    feet: "Feet",
  };
  if (map[s]) return map[s];
  // fallback: title-case the slot id (replace dashes/underscores)
  return s.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
});

const safeItem = computed(() => props.item || {});

// emit already defined above

function onDrop(e) {
  try {
    const raw = e.dataTransfer.getData("application/json");
    if (!raw) return;
    const payload = JSON.parse(raw);
    // payload: { type: 'item', item, source }
    if (payload && payload.type === "item") {
      // Quick client-side heuristic to reject obviously invalid drops
      if (!allowedForSlot(payload.item, slotId.value)) {
        emit("invalid-drop", {
          reason: "Item not valid for slot",
          slot: slotId.value,
          item: payload.item,
        });
        return;
      }
      // emit equip-item so parent (PaperDoll) can handle equipping
      // include target slot label for context
      emit("equip-item", {
        item: payload.item,
        source: payload.source,
        targetSlot: slotId.value,
      });
    }
  } catch (err) {
    console.warn("doll drop failed", err);
  }
}

function allowedForSlot(item, slotName) {
  if (!item) return false;
  const s = String(slotName || "").toLowerCase();
  // require container items for the backpack slot
  if (s === "backpack" || s === "bandolier" || s === "belt") {
    // prefer explicit itemType if present, otherwise fallback to isContainer
    if (item.itemType) {
      const it = String(item.itemType || "").toLowerCase();
      if (
        it.includes("backpack") ||
        it.includes("pack") ||
        it.includes("belt") ||
        it.includes("bandolier") ||
        it.includes("pouch")
      )
        return true;
    }
    return !!item.isContainer;
  }
  // mainhand/offhand heuristics: require weapon type if present
  if (s === "mainhand" || s === "offhand") {
    if (item.itemType) {
      return /weapon|sword|axe|mace|dagger|bow|spear|staff/i.test(
        String(item.itemType)
      );
    }
    return true; // allow if we don't have a type to judge
  }
  // default: allow and let server validate
  return true;
}
</script>

<style>
.doll-left {
  grid-column: 1;
}
.doll-right {
  grid-column: 4;
}

.empty-slot {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}
.empty-slot .v-icon__svg {
  width: 60% !important;
  height: 60% !important;
  opacity: 0.12;
}
.empty-icon {
  width: 60%;
  height: 60%;
}
</style>
