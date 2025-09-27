<template>
  <div class="inventory-panel">
    <!-- debug counts removed -->

    <div v-if="Array.isArray(containers) && containers.length">
      <v-row dense>
        <v-col cols="12">
          <v-sheet
            class="pa-2"
            elevation="0"
          >
            <div class="sheet-body">
              <div class="inventory-with-pack">
                <div
                  v-if="packContainer"
                  class="pack-area"
                >
                  <div
                    :class="[
                      'pack-slot',
                      'd-flex',
                      'align-center',
                      'justify-center',
                      { 'drag-over': packDragOver },
                    ]"
                    @dragover.prevent
                    @drop.prevent="onDropToPack"
                    @dragenter.prevent="onPackDragEnter"
                    @dragleave.prevent="onPackDragLeave"
                  >
                    <EquipmentSlot
                      slot-name="pack"
                      :item="packItem"
                      @equip-success="onEquipSuccess"
                    />
                  </div>
                </div>

                <div class="inventory-grid">
                  <InventoryGrid
                    :containers="containersForGrid"
                    @move-item="onMoveItem"
                  />
                </div>
              </div>
            </div>
          </v-sheet>
        </v-col>
      </v-row>
    </div>

    <div v-else>
      <div class="no-containers">
        No containers equipped
      </div>
    </div>

    <v-snackbar
      v-model="errorVisible"
      color="error"
      timeout="6000"
    >
      {{ errorMsg }}
      <template #action>
        <v-btn
          text
          @click="() => (errorVisible = false)"
        >
          Close
        </v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import { storeToRefs } from "pinia";
import InventoryGrid from "@/components/inventory/InventoryGrid.vue";
import EquipmentSlot from "@/components/character/EquipmentSlot.vue";
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

    // If pack wasn't present in `all` (or in the transformed list), but we have
    // a packContainer found elsewhere (e.g. in inventory), include it too.
    const hasPackInTransformed = transformed.some(
      (c) =>
        c && (String(c.id) === packId || String(c.itemId || "") === packItemId)
    );
    if (!hasPackInTransformed && packContainer.value) {
      const c = packContainer.value;
      transformed.push({ ...c, hiddenFirstCell: true });
    }
    return transformed;
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
              (it) => String(it.id) === String(itemId) || it.containerIndex === payload.source.localIndex
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
            target.items = (target.items || []).filter((it) => String(it.id) !== String(itemId));
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
      if (res && res.containers) userStore.setInventory(res.containers);
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
        const src = newInv.find((c) => String(c.id) === String(source.containerId));
        if (src && Array.isArray(src.items)) {
          const idx = src.items.findIndex(
            (it) => String(it.id) === String(itemId) || it.containerIndex === source.localIndex
          );
          if (idx !== -1) movedItem = src.items.splice(idx, 1)[0];
        }
      }

      // fallback: if not found by source, try find by id across all containers
      if (!movedItem) {
        for (const c of newInv) {
          if (!c || !Array.isArray(c.items)) continue;
          const idx = c.items.findIndex((it) => String(it.id) === String(itemId));
          if (idx !== -1) {
            movedItem = c.items.splice(idx, 1)[0];
            break;
          }
        }
      }

      if (!movedItem) movedItem = { id: itemId, containerIndex: target.localIndex };
      // set the new index for the moved item
      movedItem.containerIndex = target.localIndex;

      if (target && target.containerId != null) {
        const tgt = newInv.find((c) => String(c.id) === String(target.containerId));
        if (tgt) {
          // remove any item occupying the target slot
          tgt.items = (tgt.items || []).filter((it) => it.containerIndex !== target.localIndex);
          tgt.items.push(movedItem);
        } else {
          // append a simple container entry if missing
          newInv.push({ id: target.containerId, items: [movedItem], capacity: 1 });
        }
      }

      userStore.setInventory(newInv);

      // optimistic: if the source indicates this came from an equipped slot, clear that slot locally
      try {
        const src = source || {};
        if (src && (src.equip || src.slot)) {
          const slotKey = String(src.slot || '').toLowerCase();
          const newChar = JSON.parse(JSON.stringify(userStore.character || {}));
          if (!newChar.equipped) newChar.equipped = {};
          if (slotKey) newChar.equipped[slotKey] = null;
          if (userStore.setCharacter) userStore.setCharacter(newChar);
        }
      } catch (e) {
        console.warn('optimistic character update failed', e);
      }
    } catch (err) {
      console.warn("Optimistic update error", err);
    }

    const res = await api.post("/inventory/move", postPayload);
    if (res && res.containers) {
      userStore.setInventory(res.containers);
    }
    // if server returned authoritative equipment rows, sync the paper-doll
    if (res && res.equipment) {
      try {
        const newChar = JSON.parse(JSON.stringify(userStore.character || {}));
        if (!newChar.equipped) newChar.equipped = {};
        res.equipment.forEach((eq) => {
          const key = String(eq.slot || '').toLowerCase();
          if (eq.Item) {
            newChar.equipped[key] = { ...eq.Item, img: eq.Item.image || eq.Item.img || '/img/debug/placeholder.png', label: eq.Item.label || eq.Item.name || null };
          } else if (eq.itemId) {
            newChar.equipped[key] = { id: eq.itemId };
          } else {
            newChar.equipped[key] = null;
          }
        });
        if (userStore.setCharacter) userStore.setCharacter(newChar);
      } catch (e) {
        console.warn('Failed to sync equipment from server', e);
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
      console.error('Failed to revert optimistic character', rerr);
    }
    console.error("Failed to move item", err);
    errorMsg.value = "Failed to move item";
    errorVisible.value = true;
  }
}
</script>

<style scoped>
.pack-area {
  margin-bottom: 1rem;
}
.pack-slot {
  /* Match the paper-doll slot sizing and appearance */
  width: 100px;
  height: 100px;
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
</style>
