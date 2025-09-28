<template>
  <div class="inventory-panel">
    <!-- debug counts removed -->

    <div v-if="Array.isArray(containers) && containers.length">
      <v-row dense>
        <v-col cols="12">
          <v-sheet class="pa-2" elevation="0">
            <div class="sheet-body">
              <div class="inventory-with-pack">
                <!-- top pack-area removed; pack is rendered at bottom in nestable row -->

                <div class="inventory-grid">
                  <InventoryGrid
                    :containers="containersForGrid"
                    :highlighted-container-id="hoveredContainerId"
                    @move-item="onMoveItem"
                    @hover-container="(id) => (hoveredContainerId = id)"
                    @leave-container="() => (hoveredContainerId = null)"
                  />
                </div>
              </div>
            </div>
          </v-sheet>
        </v-col>
      </v-row>

      <!-- Nestable containers row: less prominent cells (e.g. vials) and pack rendered here -->
      <v-row v-if="Array.isArray(nestable) && nestable.length" dense>
        <v-col cols="12">
          <v-sheet class="pa-2" elevation="0">
            <!-- bottom grid: small, local grid to mirror column sizing of the top grid -->
            <div class="bottom-grid">
              <!-- pack cell: first cell, spans 2 columns to remain visually distinct -->
              <div
                v-if="packContainer"
                class="bottom-slot pack-slot d-flex align-center justify-center"
                :class="{
                  'drag-over': packDragOver,
                  highlighted:
                    String(packContainer.id) === String(hoveredContainerId),
                }"
                @dragover.prevent
                @drop.prevent="onDropToPack"
                @dragenter.prevent="onPackDragEnter"
                @dragleave.prevent="onPackDragLeave"
                @mouseenter="() => onContainerMouseEnter(packContainer)"
                @mouseleave="onContainerMouseLeave"
              >
                <EquipmentSlot
                  slot-name="pack"
                  :item="packItem"
                  @equip-success="onEquipSuccess"
                />
              </div>

              <!-- nestable items follow; each is one grid cell -->
              <template
                v-for="(n, idx) in nestableItems"
                :key="
                  n && n.container && n.container.id
                    ? String(n.container.id)
                    : idx
                "
              >
                <div
                  class="bottom-slot d-flex align-center justify-center"
                  :class="{
                    highlighted:
                      n.container &&
                      String(n.container.id) === String(hoveredContainerId),
                  }"
                  @mouseenter="() => onContainerMouseEnter(n.container)"
                  @mouseleave="onContainerMouseLeave"
                >
                  <div
                    v-if="n.item"
                    class="slot-item d-flex align-center justify-center"
                  >
                    <DraggableItem
                      :item="n.item"
                      :label="n.item && (n.item.label || n.item.name)"
                      :source="n.source"
                      :width="'100%'"
                      :height="'100%'"
                    />
                  </div>

                  <div v-else class="slot-empty">&nbsp;</div>
                </div>
              </template>
            </div>
          </v-sheet>
        </v-col>
      </v-row>
    </div>

    <div v-else>
      <div class="no-containers">No containers equipped</div>
    </div>

    <v-snackbar v-model="errorVisible" color="error" timeout="6000">
      {{ errorMsg }}
      <template #action>
        <v-btn text @click="() => (errorVisible = false)"> Close </v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import { storeToRefs } from "pinia";
import InventoryGrid from "@/components/inventory/InventoryGrid.vue";
import DraggableItem from "@/components/inventory/DraggableItem.vue";
import EquipmentSlot from "@/components/character/EquipmentSlot.vue";
import dragEventBus from "@/lib/dragEventBus";
import { useUserStore } from "@/stores/userStore";
import api from "@/utils/api.js";

const userStore = useUserStore();
const { inventory, character } = storeToRefs(userStore);

const packItem = computed(
  () =>
    (character.value &&
      character.value.equipped &&
      character.value.equipped.pack) ||
    null
);

// hovered container id for highlighting its cells in the grid
const hoveredContainerId = ref(null);
// track current dragged item (if any) so we can restrict highlights when dragging
const currentDragItem = ref(null);

function isPackContainer(c) {
  if (!c) return false;
  return Boolean(
    c.icon === "backpack" ||
      String(c.containerType || "").toUpperCase() === "PACK" ||
      String(c.containerType || "").toUpperCase() === "BACKPACK" ||
      String(c.name || "")
        .toLowerCase()
        .includes("pack")
  );
}

function containerAcceptsItem(c, item) {
  // conservative heuristic: if the dragged item explicitly targets 'pack'
  // only accept for pack-like containers. If no explicit equipmentSlot
  // is present, we allow highlighting so the user gets visual feedback.
  if (!item) return true;
  const eq = item.equipmentSlot;
  if (!eq) return true;
  if (Array.isArray(eq)) {
    if (eq.includes("pack") && isPackContainer(c)) return true;
  } else if (typeof eq === "string") {
    const es = eq.toLowerCase();
    if (es.includes("pack") && isPackContainer(c)) return true;
  }
  // unknown mapping: fallback to false when dragging an explicitly targeted item
  return false;
}

function onContainerMouseEnter(c) {
  try {
    if (!c) return;
    // if currently dragging, only highlight if container accepts the dragged item
    if (currentDragItem.value) {
      if (containerAcceptsItem(c, currentDragItem.value))
        hoveredContainerId.value = c.id;
      else hoveredContainerId.value = null;
      return;
    }
    hoveredContainerId.value = c.id;
  } catch (e) {
    hoveredContainerId.value = null;
  }
}

function onContainerMouseLeave() {
  hoveredContainerId.value = null;
}

function onGlobalDragStart(payload) {
  try {
    currentDragItem.value = payload && payload.item ? payload.item : null;
  } catch (e) {
    currentDragItem.value = null;
  }
}

function onGlobalDragEnd() {
  currentDragItem.value = null;
  // clear hover highlight when drag ends
  hoveredContainerId.value = null;
}

// register drag event listeners
try {
  dragEventBus.on("drag-start", onGlobalDragStart);
  dragEventBus.on("drag-end", onGlobalDragEnd);
  dragEventBus.on("container-hover", (p) => {
    try {
      const cid = p && p.containerId ? p.containerId : null;
      if (!cid) return;
      // if there's a dragged item active, ensure acceptance heuristics
      if (currentDragItem.value) {
        // find container object from inventory to validate
        const all = Array.isArray(inventory.value) ? inventory.value : [];
        const c = all.find((x) => String(x.id) === String(cid));
        if (c && containerAcceptsItem(c, currentDragItem.value))
          hoveredContainerId.value = cid;
        else hoveredContainerId.value = null;
        return;
      }
      hoveredContainerId.value = cid;
    } catch (e) {
      /* ignore */
    }
  });
  dragEventBus.on("container-leave", () => {
    hoveredContainerId.value = null;
  });
} catch (e) {
  /* ignore */
}

import { onBeforeUnmount } from "vue";
onBeforeUnmount(() => {
  try {
    dragEventBus.off("drag-start", onGlobalDragStart);
    dragEventBus.off("drag-end", onGlobalDragEnd);
    dragEventBus.off("container-hover");
    dragEventBus.off("container-leave");
  } catch (e) {
    /* ignore */
  }
});

// nestable containers returned by server or derived from inventory
const nestable = computed(() => {
  try {
    const fromStore = userStore.nestableInventory;
    if (Array.isArray(fromStore) && fromStore.length) return fromStore;
    const inv = Array.isArray(inventory.value) ? inventory.value : [];
    return inv.filter((c) => !!c.nestable);
  } catch (e) {
    return [];
  }
});

// Render single representative items for nestable containers in the lower row.
const nestableItems = computed(() => {
  try {
    const inv = Array.isArray(inventory.value) ? inventory.value : [];
    return (nestable.value || []).map((c) => {
      let rep = null;
      let source = null;
      if (c && c.itemId != null) {
        for (const cont of inv) {
          if (!cont || !Array.isArray(cont.items)) continue;
          const found = cont.items.find(
            (it) => String(it.id) === String(c.itemId)
          );
          if (found) {
            rep = found;
            source = { containerId: cont.id, localIndex: found.containerIndex };
            break;
          }
        }
      }
      if (!rep && Array.isArray(c.items) && c.items.length) {
        rep = c.items[0];
        source = { containerId: c.id, localIndex: rep.containerIndex || 0 };
      }
      const mapped =
        typeof userStore.mapItemForClient === "function"
          ? userStore.mapItemForClient(rep)
          : rep;
      return { container: c, item: mapped, source };
    });
  } catch (e) {
    return [];
  }
});

const containers = computed(() => {
  const inv = Array.isArray(inventory.value) ? inventory.value : [];
  const equippedMap = (character.value && character.value.equipped) || {};
  const equippedIds = new Set(
    Object.values(equippedMap)
      .map((it) => (it && it.id ? Number(it.id) : null))
      .filter((v) => v !== null)
  );

  return inv.filter((c) => {
    if (
      c &&
      (String(c.name || "").toLowerCase() === "pockets" ||
        String(c.containerType || "").toUpperCase() === "POCKETS")
    )
      return true;
    if (c && c.itemId !== undefined && c.itemId !== null)
      return equippedIds.has(Number(c.itemId));
    return false;
  });
});

const packContainer = computed(() => {
  try {
    const all = Array.isArray(inventory.value) ? inventory.value : [];
    const packIt =
      (character.value &&
        character.value.equipped &&
        character.value.equipped.pack) ||
      null;
    if (packIt && packIt.id != null) {
      const found = all.find((c) => String(c.itemId) === String(packIt.id));
      if (found) return found;
    }
    const foundByTypeOrName = all.find((c) => {
      if (!c) return false;
      const t = String(c.containerType || "").toUpperCase();
      const n = String(c.name || "").toLowerCase();
      return t === "PACK" || n.includes("pack");
    });
    if (foundByTypeOrName) return foundByTypeOrName;
    const firstNonPockets = (containers.value || []).find(
      (c) => String(c.name || "").toLowerCase() !== "pockets"
    );
    return firstNonPockets || (all.length ? all[0] : null) || null;
  } catch (e) {
    return null;
  }
});

const containersForGrid = computed(() => {
  try {
    const all = containers.value || [];
    if (!packContainer.value || !packContainer.value.id) return all;
    const packId = String(packContainer.value.id);
    const packItemId = String((packItem.value && packItem.value.id) || "");
    // Build a transformed containers list where the pack container has its
    // first (visual) slot removed so we don't duplicate the pack slot visually
    // but still render the pack's internal cells. If the pack container isn't
    // part of the `containers` list, append a transformed version so its
    // internal slots appear in the grid.
    const transformed = all.map((c) => {
      if (!c) return c;
      if (String(c.id) === packId || String(c.itemId || "") === packItemId) {
        // mark this container so the grid will hide its first visual cell
        return { ...c, hiddenFirstCell: true };
      }
      return c;
    });

    // Build a set of item ids that are represented in the lower nestable row
    const nestableIds = new Set(
      (nestableItems.value || [])
        .map((n) => (n && n.item && n.item.id ? String(n.item.id) : null))
        .filter((v) => v != null)
    );

    // Remove any items from transformed containers that are shown in the nestable row
    const transformedFiltered = transformed.map((c) => {
      if (!c || !Array.isArray(c.items)) return c;
      const items = c.items.filter(
        (it) => !nestableIds.has(String(it && it.id))
      );
      return { ...c, items };
    });

    // Also ensure nestable containers themselves are included in the main grid
    const nestables = Array.isArray(nestable.value) ? nestable.value : [];
    for (const nc of nestables) {
      if (!nc) continue;
      const exists = transformedFiltered.some(
        (c) => c && String(c.id) === String(nc.id)
      );
      if (!exists) {
        transformedFiltered.push(nc);
      }
    }
    // If pack wasn't present in the transformed list, include it and mark hiddenFirstCell
    const hasPackInTransformed = transformedFiltered.some(
      (c) =>
        c && (String(c.id) === packId || String(c.itemId || "") === packItemId)
    );
    if (!hasPackInTransformed && packContainer.value) {
      const c = packContainer.value;
      transformedFiltered.push({ ...c, hiddenFirstCell: true });
    }
    return transformedFiltered;
  } catch (e) {
    return containers.value || [];
  }
});

// Debug watchers to log container shapes at runtime
watch(
  () => containers.value,
  (v) => {
    try {
      console.debug(
        "[InventoryPanel] containers:",
        JSON.parse(JSON.stringify(v || []))
      );
    } catch (e) {
      console.debug("[InventoryPanel] containers (raw):", v);
    }
  },
  { immediate: true }
);

watch(
  () => packContainer.value,
  (v) => {
    try {
      console.debug(
        "[InventoryPanel] packContainer:",
        JSON.parse(JSON.stringify(v || null))
      );
    } catch (e) {
      console.debug("[InventoryPanel] packContainer (raw):", v);
    }
  },
  { immediate: true }
);

watch(
  () => containersForGrid.value,
  (v) => {
    try {
      console.debug(
        "[InventoryPanel] containersForGrid:",
        JSON.parse(JSON.stringify(v || []))
      );
    } catch (e) {
      console.debug("[InventoryPanel] containersForGrid (raw):", v);
    }
  },
  { immediate: true }
);

const errorVisible = ref(false);
const errorMsg = ref("");
const packDragOver = ref(false);

function onPackDragEnter() {
  packDragOver.value = true;
}
function onPackDragLeave() {
  setTimeout(() => {
    packDragOver.value = false;
  }, 40);
}

async function onDropToPack(e) {
  const raw = e.dataTransfer.getData("application/json");
  if (!raw) return;
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch (err) {
    console.error("Invalid drop payload", err);
    return;
  }

  if (payload.source === "inventory") {
    // optimistic update: move item into the current pack container immediately
    const prevInv = JSON.parse(JSON.stringify(userStore.inventory || []));
    try {
      // apply optimistic move locally so UI is snappy
      try {
        const newInv = JSON.parse(JSON.stringify(userStore.inventory || []));
        const itemId = payload.item && payload.item.id;
        const packC = packContainer.value || null;
        if (itemId != null && packC) {
          // remove from source container
          for (const c of newInv) {
            if (!c || !Array.isArray(c.items)) continue;
            const idx = c.items.findIndex(
              (it) =>
                String(it.id) === String(itemId) ||
                it.containerIndex === payload.source.localIndex
            );
            if (idx !== -1) {
              c.items.splice(idx, 1);
              break;
            }
          }
          // insert into pack container with target index = first available (append)
          const target = newInv.find((c) => String(c.id) === String(packC.id));
          const moved = { ...(payload.item || {}), containerIndex: 0 };
          if (target) {
            // ensure no duplicate at the containerIndex
            target.items = (target.items || []).filter(
              (it) => String(it.id) !== String(itemId)
            );
            // find a free index (simple heuristic: push)
            moved.containerIndex = (target.items && target.items.length) || 0;
            target.items.push(moved);
          } else {
            // if pack container is not part of inventory list, add a simple container entry
            newInv.push({ ...packC, items: [moved] });
          }
          userStore.setInventory(newInv);
        }
      } catch (err) {
        console.warn("Optimistic update failed (non-fatal)", err);
      }

      const res = await api.post("/inventory/move", {
        itemId: payload.item.id,
        toContainer: "pack",
      });
      if (res && res.containers) {
        userStore.setInventory(res.containers);
        if (Array.isArray(res.nestableContainers))
          userStore.nestableInventory = res.nestableContainers;
      } else if (userStore && userStore.ensureInventory) {
        await userStore.ensureInventory(true);
      }
    } catch (err) {
      // revert optimistic state on failure
      try {
        userStore.setInventory(prevInv);
      } catch (rerr) {
        console.error("Failed to revert optimistic inventory", rerr);
      }
      console.error("Failed to move item to pack", err);
      errorMsg.value = "Failed to move item to pack";
      errorVisible.value = true;
    }
    return;
  }

  if (payload.source === "equip" || payload.source === "container") {
    try {
      const res = await api.post("/character/equip", {
        slot: "PACK",
        itemId: payload.item.id,
      });
      if (res && res.character) userStore.setCharacter(res.character);
      if (res && res.containers) {
        userStore.setInventory(res.containers);
        if (Array.isArray(res.nestableContainers))
          userStore.nestableInventory = res.nestableContainers;
      }
    } catch (err) {
      console.error("Failed to equip pack", err);
    }
  }
}

function onEquipSuccess() {
  /* parent reaction placeholder */
}

async function onMoveItem(payload) {
  // normalize payload: backend expects itemId (number) rather than full item object
  let postPayload = payload;
  if (payload && payload.item && payload.item.id) {
    postPayload = {
      itemId: payload.item.id,
      source: payload.source,
      target: payload.target,
    };
  }

  // save previous inventory to allow revert on failure
  const prevInv = JSON.parse(JSON.stringify(userStore.inventory || []));
  // save previous character to allow revert on failure (paper-doll)
  const prevChar = JSON.parse(JSON.stringify(userStore.character || {}));

  // optimistic update: mutate local store to reflect the move immediately
  try {
    try {
      const newInv = JSON.parse(JSON.stringify(userStore.inventory || []));
      const itemId = postPayload.itemId;
      const source = postPayload.source || {};
      const target = postPayload.target || {};
      let movedItem = null;

      // remove from source container if present
      if (source && source.containerId != null) {
        const src = newInv.find(
          (c) => String(c.id) === String(source.containerId)
        );
        if (src && Array.isArray(src.items)) {
          const idx = src.items.findIndex(
            (it) =>
              String(it.id) === String(itemId) ||
              it.containerIndex === source.localIndex
          );
          if (idx !== -1) movedItem = src.items.splice(idx, 1)[0];
        }
      }

      // fallback: if not found by source, try find by id across all containers
      if (!movedItem) {
        for (const c of newInv) {
          if (!c || !Array.isArray(c.items)) continue;
          const idx = c.items.findIndex(
            (it) => String(it.id) === String(itemId)
          );
          if (idx !== -1) {
            movedItem = c.items.splice(idx, 1)[0];
            break;
          }
        }
      }

      if (!movedItem)
        movedItem = { id: itemId, containerIndex: target.localIndex };
      // set the new index for the moved item
      movedItem.containerIndex = target.localIndex;

      if (target && target.containerId != null) {
        const tgt = newInv.find(
          (c) => String(c.id) === String(target.containerId)
        );
        if (tgt) {
          // remove any item occupying the target slot
          tgt.items = (tgt.items || []).filter(
            (it) => it.containerIndex !== target.localIndex
          );
          tgt.items.push(movedItem);
        } else {
          // append a simple container entry if missing
          newInv.push({
            id: target.containerId,
            items: [movedItem],
            capacity: 1,
          });
        }
      }

      userStore.setInventory(newInv);

      // optimistic: if the source indicates this came from an equipped slot, clear that slot locally
      try {
        const src = source || {};
        if (src && (src.equip || src.slot)) {
          const slotKey = String(src.slot || "").toLowerCase();
          const newChar = JSON.parse(JSON.stringify(userStore.character || {}));
          if (!newChar.equipped) newChar.equipped = {};
          if (slotKey) newChar.equipped[slotKey] = null;
          if (userStore.setCharacter) userStore.setCharacter(newChar);
        }
      } catch (e) {
        console.warn("optimistic character update failed", e);
      }
    } catch (err) {
      console.warn("Optimistic update error", err);
    }

    const res = await api.post("/inventory/move", postPayload);
    if (res && res.containers) {
      userStore.setInventory(res.containers);
      if (Array.isArray(res.nestableContainers))
        userStore.nestableInventory = res.nestableContainers;
    }
    // if server returned authoritative equipment rows, sync the paper-doll
    if (res && res.equipment) {
      try {
        const newChar = JSON.parse(JSON.stringify(userStore.character || {}));
        if (!newChar.equipped) newChar.equipped = {};
        res.equipment.forEach((eq) => {
          const key = String(eq.slot || "").toLowerCase();
          if (eq.Item) {
            newChar.equipped[key] = {
              ...eq.Item,
              img: eq.Item.image || eq.Item.img || "/img/debug/placeholder.png",
              label: eq.Item.label || eq.Item.name || null,
            };
          } else if (eq.itemId) {
            newChar.equipped[key] = { id: eq.itemId };
          } else {
            newChar.equipped[key] = null;
          }
        });
        if (userStore.setCharacter) userStore.setCharacter(newChar);
      } catch (e) {
        console.warn("Failed to sync equipment from server", e);
      }
    } else if (userStore && userStore.ensureInventory) {
      await userStore.ensureInventory(true);
    }
  } catch (err) {
    // revert optimistic state on failure (inventory + character)
    try {
      userStore.setInventory(prevInv);
    } catch (rerr) {
      console.error("Failed to revert optimistic inventory", rerr);
    }
    try {
      if (userStore.setCharacter) userStore.setCharacter(prevChar);
    } catch (rerr) {
      console.error("Failed to revert optimistic character", rerr);
    }
    console.error("Failed to move item", err);
    errorMsg.value = "Failed to move item";
    errorVisible.value = true;
  }
}
</script>

<style scoped>
.pack-slot {
  /* Match the paper-doll slot sizing and appearance */
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  border-radius: 6px;
  /* keep background transparent so the EquipmentSlot interior is visible */
  background: transparent;
}
/* pack-slot.drag-over behavior moved to EquipmentSlot overlay */
.empty-slot {
  color: #888;
}

/* Bottom-grid: small, local grid used only for the nestable/pack row. Left-aligns cells and
   gives the pack a 2-column visual span. Kept scoped to avoid changing InventoryGrid.vue. */
.bottom-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(64px, 1fr));
  gap: 6px;
  justify-content: start; /* left-align cells */
  align-items: start;
}
.bottom-slot {
  border: 1px dashed rgba(0, 0, 0, 0.08);
  min-height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.02);
  padding: 0;
}
.bottom-slot.pack-slot {
  grid-column: span 2;
  /* only span horizontally; do not span multiple rows */
}

@media (max-width: 640px) {
  .bottom-slot.pack-slot {
    grid-column: span 1;
    grid-row: span 1;
  }
}
</style>
