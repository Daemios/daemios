<template>
  <div class="inventory-grid-root">
    <div class="inventory-grid">
      <div
        v-for="slot in slots"
        :key="slot.globalIndex"
        class="inventory-slot d-flex align-center justify-center"
        :class="{
          highlighted: slot.containerId === highlightedContainerId,
          'pack-slot': slot.isPack,
          'pack-highlight': slot.isPack && packDragActive,
        }"
  @click="() => $emit('click-item', slot.item)"
  @dragover.prevent
      >
        <!-- container icon is passed into Slot as the 'icon' prop to avoid duplicate icons -->

        <template v-if="slot.isPack">
          <Slot
            :item="slot.item"
            :label="slot.item && slot.item.name"
            :icon="slot.containerIconSvg"
            :slot-id="slot.containerId ? String(slot.containerId) : 'pack'"
            type="pack"
            @dropped="
              (p) =>
                emit('move-item', {
                  item: p.payload.item,
                  source: p.payload.source,
                  target: {
                    containerId: slot.containerId,
                    localIndex: slot.localIndex,
                  },
                })
            "
            @click="() => $emit('click-item', slot.item)"
          />
        </template>
        <template v-else>
          <Slot
            :item="slot.item"
            :label="slot.item && slot.item.name"
            :icon="slot.containerIconSvg"
            :slot-id="
              slot.containerId
                ? String(slot.containerId) + '-' + slot.localIndex
                : String(slot.globalIndex)
            "
            :source="{
              containerId: slot.containerId,
              localIndex: slot.localIndex,
            }"
            @dropped="
              (p) =>
                emit('move-item', {
                  item: p.payload.item,
                  source: p.payload.source,
                  target: {
                    containerId: slot.containerId,
                    localIndex: slot.localIndex,
                  },
                })
            "
            @click="() => $emit('click-item', slot.item)"
          />
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import Slot from "@/components/shared/Slot.vue";
import { computed, ref, onMounted, onBeforeUnmount } from "vue";
import dragEventBus from "@/lib/dragEventBus";
// Import the whole mdi namespace and pick the exact exported names that exist
import * as mdi from "@mdi/js";

const emit = defineEmits([
  "click-item",
  "move-item",
  "hover-container",
  "leave-container",
]);

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

// Track when a dragged item that is a pack is active (for highlighting pack cell)
const packDragActive = ref(false);

function onGlobalDragStart(payload) {
  try {
    const eq = payload?.item?.equipmentSlot;
    packDragActive.value = Array.isArray(eq)
      ? eq.includes("pack")
      : typeof eq === "string"
      ? eq === "pack"
      : false;
  } catch (err) {
    // swallow - defensive
  }
}

function onGlobalDragEnd() {
  packDragActive.value = false;
}

onMounted(() => {
  dragEventBus.on("drag-start", onGlobalDragStart);
  dragEventBus.on("drag-end", onGlobalDragEnd);
});

onBeforeUnmount(() => {
  dragEventBus.off("drag-start", onGlobalDragStart);
  dragEventBus.off("drag-end", onGlobalDragEnd);
});
// Build a unified slots array combining containers in order. Each slot
// includes: globalIndex, containerId, localIndex, and item (or null).
const slots = computed(() => {
  const out = [];
  try {
    console.debug(
      "[InventoryGrid] building slots for containers",
      props.containers &&
        props.containers.map((c) => ({
          id: c.id,
          capacity: c.capacity,
          items: c.items && c.items.length,
        }))
    );
  } catch (e) {
    /* ignore */
  }

  // safety: avoid building extremely large slot arrays synchronously which
  // can block the main thread and make the whole browser tab/jank. If the
  // total number of slots across containers exceeds MAX_SLOTS, we stop
  // building further slots and return a truncated view. This keeps the UI
  // responsive while still showing the leading portion of the inventory.
  const MAX_SLOTS = 500; // tunable; large enough for normal use, small enough to avoid blocking
  let global = 0;

  // precompute icon map once to avoid recreating it per slot
  const iconMap = {
    hand: mdi.mdiHandFrontRight || mdi.mdiHandPointingUp || null,
    backpack: mdi.mdiBagPersonal || mdi.mdiPackage || null,
    water: mdi.mdiWater || null,
    "food-apple": mdi.mdiFoodApple || mdi.mdiApple || null,
  };

  for (const c of props.containers || []) {
    const capacity = c?.capacity || 0;
    const itemsByIndex = {};
    (c?.items || []).forEach((it) => {
      if (typeof it.containerIndex === "number")
        itemsByIndex[it.containerIndex] = it;
    });

    // heuristics to detect backpack-like containers so we can render a larger slot
    const isBackpackContainer = Boolean(
      c &&
        (c.icon === "backpack" ||
          String(c.containerType || "").toUpperCase() === "BACKPACK" ||
          String(c.name || "")
            .toLowerCase()
            .includes("pack"))
    );

    const loopMax = Math.max(capacity, 1);
    const startIndex = c && c.hiddenFirstCell ? 1 : 0;
    for (let i = startIndex; i < loopMax; i++) {
      if (global >= MAX_SLOTS) {
        console.warn(
          "[InventoryGrid] slot build truncated at",
          MAX_SLOTS,
          "slots to avoid blocking UI"
        );
        // push a single sentinel entry indicating truncation and stop
        out.push({
          globalIndex: global++,
          containerId: null,
          localIndex: -1,
          item: null,
          truncated: true,
        });
        return out;
      }

      out.push({
        globalIndex: global++,
        containerId: c.id,
        localIndex: i,
        item: itemsByIndex[i] || null,
        containerIconSvg: c && c.icon ? iconMap[c.icon] || null : null,
        // only treat the first cell as the special pack cell when the container
        // isn't using hiddenFirstCell (we render the visual pack slot separately)
        isPack: isBackpackContainer && !c.hiddenFirstCell && i === 0,
      });
    }
  }

  if (out.length === 0)
    out.push({ globalIndex: 0, containerId: null, localIndex: 0, item: null });
  return out;
});

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
  position: relative;
  background: rgba(255, 255, 255, 0.02);
  padding: 0;
}
.slot-icon-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.12; /* raised temporarily for debugging */
  font-size: 48px;
  color: rgba(255, 255, 255, 0.95);
}

/* Ensure icons inside the slot background render at the expected size and keep them visually faint */
.slot-icon-bg .slot-icon {
  font-size: inherit;
  line-height: inherit;
  height: 1em;
  width: 1em;
  color: inherit !important;
  opacity: 1 !important;
}
.inventory-slot.highlighted {
  /* Match equipment-slot inner glow for consistency when hovering a container */
  box-shadow: inset 0 0 0 4px rgba(33, 150, 243, 0.85),
    inset 0 0 18px rgba(33, 150, 243, 0.35);
  background: rgba(33, 150, 243, 0.06);
}
.inventory-slot:not(.pack-slot) .slot-item img {
  max-width: 100%;
  max-height: 36px;
  display: block;
  margin: 0 auto;
}

/* Pack slot: let the item image fill the entire pack cell */
.inventory-slot.pack-slot .slot-item img {
  max-width: 100%;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.slot-item {
  width: 100%;
  height: 100%;
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
.inventory-slot.pack-slot {
  /* Pack occupies two columns horizontally but only one row vertically.
     Cap the visual height so it doesn't grow taller than normal slots. */
  grid-column: span 2;
  grid-row: span 1;
  max-height: 64px;
  min-height: 0;
  overflow: hidden;
  transition: all 160ms ease-in-out;
}

/* Make the content of the pack slot stretch to fill the entire 2x cell */
.inventory-slot.pack-slot {
  display: flex;
  justify-content: stretch;
  align-items: stretch;
}
.inventory-slot.pack-slot > * {
  width: 100%;
  height: 100%;
}

/* If the Slot is wrapped in an equipment-slot element (legacy wrapper),
   force that wrapper to stretch to the full pack cell too. This uses
   targeted selectors and !important to override utility classes like
   'd-flex align-center' that may prevent stretching. */
/* legacy wrapper overrides removed: Slot now constrains its own height */

/* Blue inner glow when dragging a pack over the special pack cell */
.inventory-slot.pack-highlight {
  box-shadow: inset 0 0 0 3px rgba(33, 150, 243, 0.85);
  background: rgba(33, 150, 243, 0.06);
}

@media (max-width: 640px) {
  /* On narrow screens make the pack slot occupy a single cell and reduce height */
  .inventory-slot.pack-slot {
    grid-column: span 1;
    grid-row: span 1;
    max-height: 64px;
  }
}
</style>
