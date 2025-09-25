<template>
  <div>
    <!-- Inventory header removed per UX request -->

    <div v-if="Array.isArray(containers) && containers.length">
      <!-- Unified inventory grid that receives the full containers list -->
      <v-row dense>
        <v-col cols="12">
          <v-sheet class="pa-2" elevation="0">
            <div class="sheet-title subtitle-1 font-weight-medium">
              Inventory
            </div>
            <div class="sheet-body">
              <InventoryGrid
                :containers="containers"
                :highlighted-container-id="highlightedContainerId"
                @click-item="selected = $event"
                @move-item="onMoveItem"
              />
            </div>
          </v-sheet>
        </v-col>
      </v-row>
    </div>
    <div v-else>
      <v-row>
        <v-col cols="12">
          <v-sheet class="pa-2 mb-2" elevation="0">
            <div class="sheet-title subtitle-1 font-weight-medium">
              No containers equipped
            </div>
            <div class="sheet-body">
              <div>
                Inventory will populate automatically for your active character.
              </div>
            </div>
          </v-sheet>
        </v-col>
      </v-row>

      <v-data-iterator
        v-model:items-per-page="itemsPerPage"
        v-model:page="page"
        :items="flatInventory"
        class="overflow-hidden"
        dense
      >
        <template #default>
          <v-row class="pa-2">
            <v-col
              v-for="(item, n) in flatInventory"
              :key="n"
              cols="6"
              sm="4"
              md="3"
              lg="2"
            >
              <Item
                :item="item"
                :label="item.label"
                @click="selected = { ...item }"
              />
            </v-col>
          </v-row>
        </template>
      </v-data-iterator>
    </div>

    <ItemDialog :item="selected" @close="selected = null" />
    <v-snackbar v-model="errorVisible" color="error" timeout="6000">
      {{ errorMsg }}
      <template #action>
        <v-btn text @click="() => (errorVisible = false)"> Close </v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from "vue";
import Item from "@/components/inventory/Item.vue";
import ItemDialog from "@/components/inventory/ItemDialog.vue";
import { useUserStore } from "@/stores/userStore";
import { storeToRefs } from "pinia";
import InventoryGrid from "@/components/inventory/InventoryGrid.vue";
import api from "@/utils/api.js";

const userStore = useUserStore();
const { inventory, character } = storeToRefs(userStore);

// Only show containers that are actually equipped (backpack/belt/bandolier)
// plus the Pockets container. This avoids rendering unrelated containers
// that belong to the character but are not currently equipped.
const containers = computed(() => {
  const inv = Array.isArray(inventory.value) ? inventory.value : [];
  const equippedMap = (character.value && character.value.equipped) || {};
  const equippedIds = new Set(
    Object.values(equippedMap)
      .map((it) => (it && it.id ? Number(it.id) : null))
      .filter((v) => v !== null)
  );

  return inv.filter((c) => {
    // Always include pockets
    if (c && String(c.name).toLowerCase() === "pockets") return true;
    // Include containers whose itemId corresponds to an equipped item
    if (c && c.itemId !== undefined && c.itemId !== null) {
      return equippedIds.has(Number(c.itemId));
    }
    return false;
  });
});
watch(
  containers,
  (val) => {
    try {
      console.debug(
        "[InventoryPanel] containers changed",
        val &&
          val.map((c) => ({
            id: c.id,
            capacity: c.capacity,
            items: c.items && c.items.length,
          }))
      );
    } catch (e) {
      /* ignore */
    }
  },
  { deep: true, immediate: true }
);
const flatInventory = computed(() => {
  // flatten containers -> items for legacy full-list view
  if (!Array.isArray(inventory.value)) return [];
  return inventory.value.reduce((acc, c) => acc.concat(c.items || []), []);
});

const selected = ref(null);
const itemsPerPage = ref(20);
const page = ref(1);
const highlightedContainerId = ref(null);
const errorVisible = ref(false);
const errorMsg = ref("");

// no placeholder container; hide the grid when no containers are equipped

// inventory refresh is automatic; manual refresh UI removed for seamless gameplay

const numberOfPages = computed(() => {
  const len = Array.isArray(inventory.value) ? inventory.value.length : 0;
  return Math.max(1, Math.ceil(len / itemsPerPage.value));
});

function onMoveItem(payload) {
  // payload: { item, source: { containerId, localIndex }, target: { containerId, localIndex } }
  try {
    if (!payload || !payload.item) return;
    const src = payload.source || {};
    const tgt = payload.target || {};

    // If the drag originated from an equipped slot (paper doll), the source
    // object will be flagged with `equip: true`. In that case, the server
    // should be asked to move the item from the equipped state into the
    // target container. We'll call POST /inventory/move and adopt the
    // canonical containers returned by the server. This avoids complex
    // optimistic logic for unequipping.
    if (src && src.equip) {
      (async () => {
        try {
          const body = {
            itemId: payload.item && payload.item.id,
            source: src,
            target: tgt,
          };
          const res = await api.post("/inventory/move", body);
          if (res && res.containers) {
            // server returns canonical containers for active character
            userStore.setInventory(res.containers);
          }
          // Also refresh character equipped mapping to ensure the slot is cleared
          // after unequip. The userStore.refreshCharacter method will re-fetch
          // the active character from the server if available; fall back to
          // clearing the local equipped entry.
          try {
            if (userStore && userStore.refreshCharacter)
              await userStore.refreshCharacter();
            else {
              // best-effort local update: if source.slot provided, clear it
              const newChar = JSON.parse(
                JSON.stringify(userStore.character || {})
              );
              if (newChar && newChar.equipped && src.slot)
                newChar.equipped[src.slot] = null;
              userStore.setCharacter(newChar);
            }
          } catch (e) {
            /* ignore character refresh errors */
          }
          return;
        } catch (err) {
          console.warn("unequip move failed", err);
          errorMsg.value = "Failed to unequip item. Changes were reverted.";
          errorVisible.value = true;
          return;
        }
      })();
      return;
    }

    // Existing in-container swap/move logic follows for items moved between containers
    // keep previous inventory for rollback in case the server rejects the move
    const prevInventory = JSON.parse(JSON.stringify(inventory.value || []));

    // Work on a deep clone of inventory to avoid mutating pinia state directly
    const newInventory = JSON.parse(JSON.stringify(inventory.value || []));

    const sourceContainer = newInventory.find((c) => c.id === src.containerId);
    const targetContainer = newInventory.find((c) => c.id === tgt.containerId);

    if (!sourceContainer || !targetContainer) return;

    // find the item index in source by containerIndex
    const sourceIdx = (sourceContainer.items || []).findIndex(
      (it) => it.containerIndex === src.localIndex
    );
    const targetIdx = (targetContainer.items || []).findIndex(
      (it) => it.containerIndex === tgt.localIndex
    );

    const movingItem = sourceIdx >= 0 ? sourceContainer.items[sourceIdx] : null;

    // remove from source
    if (sourceIdx >= 0) sourceContainer.items.splice(sourceIdx, 1);

    // if target occupied, swap (place existing target into source localIndex)
    if (targetIdx >= 0) {
      const displaced = targetContainer.items.splice(targetIdx, 1)[0];
      // put displaced into source at the original localIndex
      if (!sourceContainer.items) sourceContainer.items = [];
      displaced.containerIndex = src.localIndex;
      sourceContainer.items.push(displaced);
    }

    // put moving item into target at target.localIndex
    if (movingItem) {
      movingItem.containerIndex = tgt.localIndex;
      if (!targetContainer.items) targetContainer.items = [];
      targetContainer.items.push(movingItem);
    }

    // commit new inventory state
    userStore.setInventory(newInventory);

    // Persist the move to the backend. If it fails, rollback to previous state and notify user.
    (async () => {
      try {
        // Assumption: server exposes POST /inventory/move that accepts { itemId, source, target }
        const body = {
          itemId: movingItem && movingItem.id ? movingItem.id : payload.item.id,
          source: src,
          target: tgt,
        };
        const res = await api.post("/inventory/move", body);
        // If server returns canonical inventory, adopt it
        if (res && res.inventory) {
          userStore.setInventory(res.inventory);
        }
      } catch (err) {
        console.warn("persist move failed, rolling back", err);
        try {
          userStore.setInventory(prevInventory);
        } catch (e) {
          console.error("rollback failed", e);
        }
        errorMsg.value = "Failed to move item. Changes were reverted.";
        errorVisible.value = true;
      }
    })();
  } catch (err) {
    console.warn("move failed", err);
  }
}

// containers are now equipment slots (backpack/belt/bandolier) on the PaperDoll

watch(
  inventory,
  () => {
    const pages = numberOfPages.value;
    if (page.value > pages) page.value = pages;
  },
  { deep: true }
);

onMounted(async () => {
  // Ensure inventory is available; avoid re-fetching if cached
  await userStore.ensureInventory();
});

watch(itemsPerPage, () => {
  const pages = numberOfPages.value;
  if (page.value > pages) page.value = pages;
});
</script>

<style scoped></style>
