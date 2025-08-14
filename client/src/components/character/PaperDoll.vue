<template>

  <div class="flex-grow-0">

    <div class="doll-grid">

      <!-- Trinkets -->
      <div class="trinkets d-flex">
        <!-- Additional Items -->
        <DollSlot
          :item="equipped.trinket1"
          left
          @click="selected = equipped.trinket1"
        />
        <DollSlot
          :item="equipped.trinket2"
          left
          @click="selected = equipped.trinket2"
        />
        <DollSlot
          :item="equipped.trinket3"
          left
          @click="selected = equipped.trinket3"
        />
      </div>

      <!-- Left Column -->
      <DollSlot
        label="Head"
        :item="equipped.head"
        left
        @click="selected = equipped.head"
      />
      <DollSlot
        label="Shoulders"
        :item="equipped.shoulders"
        left
        @click="selected = equipped.shoulders"
      />
      <DollSlot
        label="Back"
        :item="equipped.back"
        left
        @click="selected = equipped.back"
      />
      <DollSlot
        label="Chest"
        :item="equipped.chest"
        left
        @click="selected = equipped.chest"
      />

      <!-- Avatar -->
      <v-card class="avatar d-flex align-center justify-center">
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
      />
      <DollSlot
        label="Waist"
        :item="equipped.waist"
        right
        @click="selected = equipped.waist"
      />
      <DollSlot
        label="Legs"
        :item="equipped.legs"
        right
        @click="selected = equipped.legs"
      />
      <DollSlot
        label="Feet"
        :item="equipped.feet"
        right
      />

      <!-- Weapons -->
      <DollSlot
        label="mainhand"
        :item="equipped.mainhand"
        class="weapon-mainhand"
        @click="selected = {...equipped.mainhand}"
      />
      <DollSlot
        label="offhand"
        :item="equipped.offhand"
        class="weapon-offhand"
        @click="selected = {...equipped.offhand}"
      />
    </div>

    <!-- Equipment Item Dialog -->
    <ItemDialog
      :item="selected"
      @close="selected = null"
    />

  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { mdiClose } from '@mdi/js';
import DollSlot from '@/components/character/DollSlot.vue';
import ItemDialog from '@/components/inventory/ItemDialog.vue';
import { useUserStore } from '@/stores/userStore';

const selected = ref(null);
const userStore = useUserStore();

const character = computed(() => userStore.character || { equipped: {} });
const equipped = computed(() => character.value.equipped || {});
</script>

<style>
.doll-grid {
  display: grid;
  grid-template-columns: 100px auto auto 100px;
  grid-auto-rows: 100px;
  grid-gap: .5rem;
  grid-auto-flow: dense;
  min-width: 650px;
  max-width: 650px;
}
.doll-grid .trinkets { grid-column: span 4; }
.doll-grid .weapon-mainhand, .doll-grid .weapon-offhand { grid-column: span 2; height: 100px; }
.doll-grid .avatar { grid-column: 2/4; grid-row: span 4; }
.doll-grid .avatar span { width: 100% !important; height: 100% !important; }
.doll-grid .avatar .v-icon__svg { width: 100% !important; height: 100% !important; }
</style>
