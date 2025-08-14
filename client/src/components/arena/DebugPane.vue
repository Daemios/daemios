<template>
  <v-card class="debug-pane pa-2">
    <div><STRONG>--- DEBUG ---</STRONG></div>
    <div><strong>Active</strong> {{ active.x }} | {{ active.y }}</div>
    <v-btn
      x-small
      class="mt-2"
      @click="cycleActive"
    >
      Cycle Active
    </v-btn>
  </v-card>
</template>

<script setup>
import { storeToRefs } from 'pinia';
import { useArenaStore } from '@/stores/arenaStore';

const arenaStore = useArenaStore();
const {
  terrain,
  entities,
  entityRegistry,
  activeRegister: active,
  plannedPath,
  shapeOnMouse,
  playerActive,
} = storeToRefs(arenaStore);

function cycleActive() {
  const index = active.value.index + 1;
  let newActive = {};
  if (index < entityRegistry.value.length) {
    newActive = {
      x: entityRegistry.value[index].x,
      y: entityRegistry.value[index].y,
      index,
    };
  } else {
    newActive = {
      x: entityRegistry.value[0].x,
      y: entityRegistry.value[0].y,
      index: 0,
    };
  }
  arenaStore.setActive(newActive);
}
</script>

<style>
.debug-pane { position: absolute; left: 0; z-index: 99; }
</style>
