<template>
  <div
    :class="['equipment-slot', { 'doll-left': left, 'doll-right': right } ]"
    style="position: relative"
    @dragover.prevent
    @drop="onDrop"
    @click="onClick"
  >
    <template v-if="item">
      <DraggableItem
        :item="safeItem"
        :label="displayLabel"
        :source="{ equip: true, slot: slotId, equippedItemId: safeItem.id }"
        :width="'100%'"
        :height="'100%'"
      />
    </template>
    <template v-else>
      <div
        class="empty-slot d-flex align-center justify-center"
        role="button"
      >
        <v-icon class="empty-icon">
          {{ mdiClose }}
        </v-icon>
      </div>
    </template>

    <div
      v-if="displayLabel"
      style="position: absolute; bottom: 4px; left: 50%; transform: translateX(-50%);"
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
import { computed } from 'vue';
import DraggableItem from '@/components/inventory/DraggableItem.vue';
import { mdiClose } from '@mdi/js';
import { useUserStore } from '@/stores/userStore';
import api from '@/utils/api.js';

const props = defineProps({
  item: { type: Object, default: null },
  label: { type: String, default: null },
  slotName: { type: String, default: null },
  left: { type: Boolean, default: false },
  right: { type: Boolean, default: false },
});

const emit = defineEmits(['click', 'equip-success', 'invalid-drop']);

const userStore = useUserStore();

const safeItem = computed(() => props.item || {});

const slotId = computed(() => {
  const candidate = props.slotName || (props.item && props.item.slot) || props.label || '';
  return String(candidate || '').toLowerCase();
});

const displayLabel = computed(() => {
  if (props.label) return props.label;
  const s = slotId.value;
  if (!s) return null;
  const map = {
    bandolier: 'Trinket',
    backpack: 'Backpack',
    belt: 'Belt',
    mainhand: 'Main Hand',
    offhand: 'Off Hand',
    head: 'Head',
    shoulders: 'Shoulders',
    back: 'Back',
    chest: 'Chest',
    hands: 'Hands',
    waist: 'Waist',
    legs: 'Legs',
    feet: 'Feet',
  };
  if (map[s]) return map[s];
  return s.replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
});

function allowedForSlot(item, slotName) {
  if (!item) return false;
  const s = String(slotName || '').toLowerCase();
  if (s === 'backpack' || s === 'bandolier' || s === 'belt') {
    if (item.itemType) {
      const it = String(item.itemType || '').toLowerCase();
      if (it.includes('backpack') || it.includes('pack') || it.includes('belt') || it.includes('bandolier') || it.includes('pouch')) return true;
    }
    return !!item.isContainer;
  }
  if (s === 'mainhand' || s === 'offhand') {
    if (item.itemType) {
      return /weapon|sword|axe|mace|dagger|bow|spear|staff/i.test(String(item.itemType));
    }
    return true;
  }
  return true;
}

async function onDrop(e) {
  try {
    const raw = e.dataTransfer.getData('application/json');
    if (!raw) return;
    const payload = JSON.parse(raw);
    if (!payload || payload.type !== 'item') return;
    // Quick client-side heuristic validation
    if (!allowedForSlot(payload.item, slotId.value)) {
      emit('invalid-drop', { reason: 'Item not valid for slot', slot: slotId.value, item: payload.item });
      return;
    }

    // Always ask server to equip the item into this slot. Server will handle
    // moving between containers/equipment and return canonical data.
    const body = { itemId: payload.item && payload.item.id, slot: String(slotId.value).toUpperCase() };
    try {
      const res = await api.post('/character/equip', body);
      if (res && res.character) {
        userStore.setCharacter(res.character);
      } else if (res && (res.containers || res.equipment)) {
        const newChar = { ...(userStore.character || {}), equipped: { ...(userStore.character && userStore.character.equipped) } };
        if (!newChar.equipped) newChar.equipped = {};
        if (res.equipment && Array.isArray(res.equipment)) {
          res.equipment.forEach((eq) => {
            const key = String(eq.slot || '').toLowerCase();
            if (eq.Item) {
              newChar.equipped[key] = { ...eq.Item, img: eq.Item.image || eq.Item.img || '/img/debug/placeholder.png', label: eq.Item.label || eq.Item.name || eq.Item.displayName || null };
            } else if (eq.itemId) {
              newChar.equipped[key] = { id: eq.itemId };
            } else {
              newChar.equipped[key] = null;
            }
          });
        }
        if (res.containers) {
          userStore.setCharacterAndInventory(newChar, res.containers, { capacityUpdated: res.capacityUpdated, updatedContainerIds: res.updatedContainerIds });
        } else {
          userStore.setCharacter(newChar);
        }
      }
      emit('equip-success', { slot: slotId.value });
    } catch (err) {
      console.warn('equip failed', err);
      emit('invalid-drop', { reason: 'Server equip failed', slot: slotId.value, item: payload.item });
    }
  } catch (err) {
    console.warn('equipment slot drop failed', err);
  }
}

function onClick() {
  emit('click', safeItem.value);
}
</script>

<style scoped>
.equipment-slot .empty-slot {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}
.equipment-slot .empty-slot .v-icon__svg {
  width: 60% !important;
  height: 60% !important;
  opacity: 0.12;
}
.equipment-slot .empty-icon {
  width: 60%;
  height: 60%;
}
</style>
