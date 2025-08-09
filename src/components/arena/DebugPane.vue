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

<script>
import { useArenaStore } from '@/stores/arenaStore';

export default {
  computed: {
    terrain() { return useArenaStore().terrain; },
    entities() { return useArenaStore().entities; },
    entityRegistry() { return useArenaStore().entityRegistry; },
    active() { return useArenaStore().activeRegister; },
    plannedPath() { return useArenaStore().plannedPath; },
    shapeOnMouse() { return useArenaStore().shapeOnMouse; },
    playerActive() { return useArenaStore().playerActive; },
  },
  methods: {
    cycleActive() {
      const store = useArenaStore();
      let newActive = {};
      const index = store.activeRegister.index + 1;
      if (index < store.entityRegistry.length) {
        newActive = { x: store.entityRegistry[index].x, y: store.entityRegistry[index].y, index };
      } else {
        newActive = { x: store.entityRegistry[0].x, y: store.entityRegistry[0].y, index: 0 };
      }
      store.setActive(newActive);
    },
  },
};
</script>

<style>
.debug-pane { position: absolute; left: 0; z-index: 99; }
</style>
