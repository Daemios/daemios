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
        }"
        @click="() => $emit('click-item', slot.item)"
        @dragover.prevent
        @drop="onDrop($event, slot)"
      >
        <div
          v-if="slot.containerIconSvg"
          class="slot-icon-bg d-flex align-center justify-center"
        >
          <!-- Pass the SVG path (from @mdi/js) as slot content to v-icon so mdi-svg renders it -->
          <v-icon class="slot-icon d-inline-flex align-center justify-center">
            {{ slot.containerIconSvg }}
          </v-icon>
        </div>

        <div
          v-if="slot.item"
          class="slot-item d-flex align-center justify-center"
        >
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
// Import the whole mdi namespace and pick the exact exported names that exist
import * as mdi from "@mdi/js";

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
  /* larger visual slot: span two grid cells horizontally and vertically
     reduced size so it doesn't overpower the grid; add responsive rules
     to collapse to a single cell on small screens */
  grid-column: span 2;
  grid-row: span 2;
  min-height: 104px;
  transition: all 160ms ease-in-out;
}

@media (max-width: 640px) {
  /* On narrow screens make the pack slot occupy a single cell and reduce height */
  .inventory-slot.pack-slot {
    grid-column: span 1;
    grid-row: span 1;
    min-height: 96px;
  }
}
</style>
