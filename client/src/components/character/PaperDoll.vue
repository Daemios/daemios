<template>
  <div class="flex-grow-0">
    <div class="doll-grid">
      <!-- Equipment quick slots: Backpack, Belt, Bandolier -->
      <div class="trinkets d-flex">
        <DollSlot
          slot-name="backpack"
          :item="equipped.backpack"
          left
          @click="selected = equipped.backpack"
          @equip-item="onEquipItem"
        />
        <DollSlot
          slot-name="belt"
          :item="equipped.belt"
          left
          @click="selected = equipped.belt"
          @equip-item="onEquipItem"
        />
        <DollSlot
          slot-name="bandolier"
          :item="equipped.bandolier"
          left
          @click="selected = equipped.bandolier"
          @equip-item="onEquipItem"
        />
      </div>

      <!-- Left Column -->
      <DollSlot
        label="Head"
        :item="equipped.head"
        left
        @click="selected = equipped.head"
        @equip-item="onEquipItem"
      />
      <DollSlot
        label="Shoulders"
        :item="equipped.shoulders"
        left
        @click="selected = equipped.shoulders"
        @equip-item="onEquipItem"
      />
      <DollSlot
        label="Back"
        :item="equipped.back"
        left
        @click="selected = equipped.back"
        @equip-item="onEquipItem"
      />
      <DollSlot
        label="Chest"
        :item="equipped.chest"
        left
        @click="selected = equipped.chest"
        @equip-item="onEquipItem"
      />

      <!-- Avatar -->
      <v-card
        class="avatar d-flex align-center justify-center"
        flat
      >
        <v-icon>
          {{ mdiClose }}
        </v-icon>
      </v-card>

      <!-- Right Column -->
      <DollSlot
        label="Hands"
        :item="equipped.hands"
        right
        @click="selected = equipped.hands"
        @equip-item="onEquipItem"
      />
      <DollSlot
        label="Waist"
        :item="equipped.waist"
        right
        @click="selected = equipped.waist"
        @equip-item="onEquipItem"
      />
      <DollSlot
        label="Legs"
        :item="equipped.legs"
        right
        @click="selected = equipped.legs"
        @equip-item="onEquipItem"
      />
      <DollSlot
        label="Feet"
        :item="equipped.feet"
        right
        @equip-item="onEquipItem"
      />

      <!-- Weapons -->
      <DollSlot
        label="mainhand"
        :item="equipped.mainhand"
        class="weapon-mainhand"
        @click="selected = { ...equipped.mainhand }"
        @equip-item="onEquipItem"
      />
      <DollSlot
        label="offhand"
        :item="equipped.offhand"
        class="weapon-offhand"
        @click="selected = { ...equipped.offhand }"
        @equip-item="onEquipItem"
      />
    </div>

    <!-- Equipment Item Dialog -->
    <ItemDialog
      :item="selected"
      @close="selected = null"
    />
  </div>
  <v-snackbar
    v-model="equipErrorVisible"
    color="error"
    timeout="6000"
  >
    {{ equipErrorMsg }}
    <template #action>
      <v-btn
        text
        @click="() => (equipErrorVisible = false)"
      >
        Close
      </v-btn>
    </template>
  </v-snackbar>
</template>

<script setup>
import { ref, computed } from "vue";
import { mdiClose } from "@mdi/js";
import DollSlot from "@/components/character/DollSlot.vue";
import ItemDialog from "@/components/inventory/ItemDialog.vue";
import { useUserStore } from "@/stores/userStore";
import api from "@/utils/api.js";

const selected = ref(null);
const userStore = useUserStore();

const equipErrorVisible = ref(false);
const equipErrorMsg = ref("");

async function onEquipItem(payload) {
  // payload: { item, source, targetSlot }
  if (!payload || !payload.item) return;
  const prevChar = JSON.parse(JSON.stringify(userStore.character || {}));
  try {
    // optimistic local equip: update store.character.equipped[targetSlot] = item
    const newChar = JSON.parse(JSON.stringify(userStore.character || {}));
    if (!newChar.equipped) newChar.equipped = {};
    newChar.equipped[payload.targetSlot] = payload.item;
    userStore.setCharacter(newChar);

    // persist to server
    // Assumption: API endpoint POST /character/equip { itemId, targetSlot, source }
    const body = { itemId: payload.item.id, targetSlot: payload.targetSlot, source: payload.source };
    const res = await api.post('/character/equip', body);
    if (res && res.character) {
      userStore.setCharacter(res.character);
    }
  } catch (err) {
    console.warn('equip failed, rolling back', err);
    try {
      userStore.setCharacter(prevChar);
    } catch (e) {
      console.error('equip rollback failed', e);
    }
    equipErrorMsg.value = 'Failed to equip item. Changes were reverted.';
    equipErrorVisible.value = true;
  }
}

const character = computed(() => userStore.character || { equipped: {} });
const equipped = computed(() => character.value.equipped || {});
</script>

<style>
.doll-grid {
  display: grid;
  grid-template-columns: 100px auto auto 100px;
  grid-auto-rows: 100px;
  grid-gap: 0.5rem;
  grid-auto-flow: dense;
  min-width: 650px;
  max-width: 650px;
}
.doll-grid .trinkets {
  grid-column: span 4;
}
.doll-grid .weapon-mainhand,
.doll-grid .weapon-offhand {
  grid-column: span 2;
  height: 100px;
}
.doll-grid .avatar {
  grid-column: 2/4;
  grid-row: span 4;
}
.doll-grid .avatar span {
  width: 100% !important;
  height: 100% !important;
}
.doll-grid .avatar .v-icon__svg {
  width: 100% !important;
  height: 100% !important;
}
</style>
