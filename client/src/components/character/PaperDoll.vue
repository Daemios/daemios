<template>
  <div class="flex-grow-0">
    <div class="doll-grid">
      <EquipmentSlot
        slot-name="mainhand"
        label="Mainhand"
        :item="equipped.mainhand"
        class="left-row-1"
        left
        @click="selected = { ...equipped.mainhand }"
        @equip-success="onEquipSuccess"
      />

      <EquipmentSlot
        slot-name="offhand"
        label="Offhand"
        :item="equipped.offhand"
        class="left-row-2"
        @click="selected = { ...equipped.offhand }"
        @equip-success="onEquipSuccess"
      />

      <EquipmentSlot
        slot-name="hands"
        label="Hands"
        :item="equipped.hands"
        class="left-row-3"
        @click="selected = equipped.hands"
        @equip-success="onEquipSuccess"
      />

      <EquipmentSlot
        slot-name="trinket1"
        label="Trinket"
        :item="equipped.trinket1"
        class="left-row-4"
        @click="selected = equipped.trinket1"
        @equip-success="onEquipSuccess"
      />

      <EquipmentSlot
        slot-name="trinket2"
        label="Trinket"
        :item="equipped.trinket2"
        class="left-row-5"
        @click="selected = equipped.trinket2"
        @equip-success="onEquipSuccess"
      />

      <EquipmentSlot
        slot-name="head"
        label="Head"
        :item="equipped.head"
        class="right-row-1"
        @click="selected = equipped.head"
        @equip-success="onEquipSuccess"
      />

      <EquipmentSlot
        slot-name="chest"
        label="Chest"
        :item="equipped.chest"
        class="right-row-2"
        @click="selected = equipped.chest"
        @equip-success="onEquipSuccess"
      />

      <EquipmentSlot
        slot-name="waist"
        label="Waist"
        :item="equipped.waist"
        class="right-row-3"
        @click="selected = equipped.waist"
        @equip-success="onEquipSuccess"
      />

      <EquipmentSlot
        slot-name="leg"
        label="Legs"
        :item="equipped.leg"
        class="right-row-4"
        @click="selected = equipped.leg"
        @equip-success="onEquipSuccess"
      />

      <EquipmentSlot
        slot-name="feet"
        label="Boots"
        :item="equipped.feet"
        class="right-row-5"
        @click="selected = equipped.feet"
        @equip-success="onEquipSuccess"
      />

      <v-card
        class="avatar d-flex align-center justify-center"
        flat
      >
        <v-icon>{{ mdiClose }}</v-icon>
      </v-card>
    </div>

    <ItemDialog
      :item="selected"
      @close="selected = null"
    />

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
  </div>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import { mdiClose } from "@mdi/js";
import EquipmentSlot from "@/components/character/EquipmentSlot.vue";
import ItemDialog from "@/components/inventory/ItemDialog.vue";
import { useUserStore } from "@/stores/userStore";

const selected = ref(null);
const userStore = useUserStore();

const equipErrorVisible = ref(false);
const equipErrorMsg = ref("");

function onEquipSuccess(evt) {
  // EquipmentSlot already updated the store. Keep placeholder for future UI actions.
}

const character = computed(() => userStore.character || { equipped: {} });
const equipped = computed(() => character.value.equipped || {});

// debug: log what backpack object looks like when paper doll renders
watch(
  () => equipped.value.pack,
  (v) => {
    console.debug(
      "[PaperDoll] backpack",
      v && { id: v.id, img: v && v.img, label: v && v.label }
    );
  },
  { immediate: true }
);
</script>

<style>
.doll-grid {
  display: grid;
  grid-template-columns: 100px auto auto 100px;
  grid-template-rows: repeat(5, 100px);
  grid-gap: 0.5rem;
  grid-auto-flow: dense;
  min-width: 650px;
  max-width: 650px;
}
.doll-grid .avatar {
  grid-column: 2 / 4;
  grid-row: span 3;
}
.doll-grid .left-row-1 {
  grid-column: 1;
  grid-row: 1;
}
.doll-grid .left-row-2 {
  grid-column: 1;
  grid-row: 2;
}
.doll-grid .left-row-3 {
  grid-column: 1;
  grid-row: 3;
}
.doll-grid .left-row-4 {
  grid-column: 1;
  grid-row: 4;
}
.doll-grid .left-row-5 {
  grid-column: 1;
  grid-row: 5;
}
.doll-grid .right-row-1 {
  grid-column: 4;
  grid-row: 1;
}
.doll-grid .right-row-2 {
  grid-column: 4;
  grid-row: 2;
}
.doll-grid .right-row-3 {
  grid-column: 4;
  grid-row: 3;
}
.doll-grid .right-row-4 {
  grid-column: 4;
  grid-row: 4;
}
.doll-grid .right-row-5 {
  grid-column: 4;
  grid-row: 5;
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
