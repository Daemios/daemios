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
                    :class="['pack-slot', 'd-flex', 'align-center', 'justify-center', { 'drag-over': packDragOver }]"
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
import { ref, computed, watch } from 'vue';
import { storeToRefs } from 'pinia';
import InventoryGrid from '@/components/inventory/InventoryGrid.vue';
import EquipmentSlot from '@/components/character/EquipmentSlot.vue';
import { useUserStore } from '@/stores/userStore';
import api from '@/utils/api.js';

const userStore = useUserStore();
const { inventory, character } = storeToRefs(userStore);

const packItem = computed(() => (character.value && character.value.equipped && character.value.equipped.pack) || null);

const containers = computed(() => {
  const inv = Array.isArray(inventory.value) ? inventory.value : [];
  const equippedMap = (character.value && character.value.equipped) || {};
  const equippedIds = new Set(Object.values(equippedMap).map((it) => (it && it.id ? Number(it.id) : null)).filter((v) => v !== null));

  return inv.filter((c) => {
    if (c && (String(c.name || '').toLowerCase() === 'pockets' || String(c.containerType || '').toUpperCase() === 'POCKETS')) return true;
    if (c && c.itemId !== undefined && c.itemId !== null) return equippedIds.has(Number(c.itemId));
    return false;
  });
});

const packContainer = computed(() => {
  try {
    const all = Array.isArray(inventory.value) ? inventory.value : [];
    const packIt = (character.value && character.value.equipped && character.value.equipped.pack) || null;
    if (packIt && packIt.id != null) {
      const found = all.find((c) => String(c.itemId) === String(packIt.id));
      if (found) return found;
    }
    const foundByTypeOrName = all.find((c) => {
      if (!c) return false;
      const t = String(c.containerType || '').toUpperCase();
      const n = String(c.name || '').toLowerCase();
      return t === 'PACK' || n.includes('pack');
    });
    if (foundByTypeOrName) return foundByTypeOrName;
    const firstNonPockets = (containers.value || []).find((c) => String(c.name || '').toLowerCase() !== 'pockets');
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
    const packItemId = String((packItem.value && packItem.value.id) || '');
    // Build a transformed containers list where the pack container has its
    // first (visual) slot removed so we don't duplicate the pack slot visually
    // but still render the pack's internal cells. If the pack container isn't
    // part of the `containers` list, append a transformed version so its
    // internal slots appear in the grid.
    const transformed = all.map((c) => {
      if (!c) return c;
      if (String(c.id) === packId || String(c.itemId || '') === packItemId) {
        // mark this container so the grid will hide its first visual cell
        return { ...c, hiddenFirstCell: true };
      }
      return c;
    });

    // If pack wasn't present in `all` (or in the transformed list), but we have
    // a packContainer found elsewhere (e.g. in inventory), include it too.
    const hasPackInTransformed = transformed.some(
      (c) => c && (String(c.id) === packId || String(c.itemId || '') === packItemId)
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
watch(() => containers.value, (v) => {
  try { console.debug('[InventoryPanel] containers:', JSON.parse(JSON.stringify(v || []))); } catch (e) { console.debug('[InventoryPanel] containers (raw):', v); }
}, { immediate: true });

watch(() => packContainer.value, (v) => {
  try { console.debug('[InventoryPanel] packContainer:', JSON.parse(JSON.stringify(v || null))); } catch (e) { console.debug('[InventoryPanel] packContainer (raw):', v); }
}, { immediate: true });

watch(() => containersForGrid.value, (v) => {
  try { console.debug('[InventoryPanel] containersForGrid:', JSON.parse(JSON.stringify(v || []))); } catch (e) { console.debug('[InventoryPanel] containersForGrid (raw):', v); }
}, { immediate: true });

const errorVisible = ref(false);
const errorMsg = ref('');
const packDragOver = ref(false);

function onPackDragEnter() { packDragOver.value = true; }
function onPackDragLeave() { setTimeout(() => { packDragOver.value = false; }, 40); }

async function onDropToPack(e) {
  const raw = e.dataTransfer.getData('application/json');
  if (!raw) return;
  let payload;
  try { payload = JSON.parse(raw); } catch (err) { console.error('Invalid drop payload', err); return; }

  if (payload.source === 'inventory') {
    try { await api.post('/inventory/move', { itemId: payload.item.id, toContainer: 'pack' }); if (userStore && userStore.refreshCharacter) await userStore.refreshCharacter(); } catch (err) { console.error('Failed to move item to pack', err); }
    return;
  }

  if (payload.source === 'equip' || payload.source === 'container') {
    try { const res = await api.post('/character/equip', { slot: 'PACK', itemId: payload.item.id }); if (res && res.character) userStore.setCharacter(res.character); if (res && res.containers) userStore.setInventory(res.containers); } catch (err) { console.error('Failed to equip pack', err); }
  }
}

function onEquipSuccess() { /* parent reaction placeholder */ }

async function onMoveItem(payload) {
  try { await api.post('/inventory/move', payload); if (userStore && userStore.refreshCharacter) await userStore.refreshCharacter(); } catch (err) { console.error('Failed to move item', err); errorMsg.value = 'Failed to move item'; errorVisible.value = true; }
}
</script>

<style scoped>
.pack-area { margin-bottom: 1rem; }
.pack-slot { width: 96px; height: 96px; border: 1px dashed #ccc; display: flex; align-items: center; justify-content: center; }
.empty-slot { color: #888; }
</style>
