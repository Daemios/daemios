<template>
  <v-card class="debug-pane pa-2">
    <div><STRONG>--- DEBUG ---</STRONG></div>
    <div><strong>Active</strong> {{ active.x }} | {{ active.y }}</div>
  </v-card>
</template>

<script>
import { mapState } from 'vuex';

export default {
  computed: {
    ...mapState({
      map: (state) => state.arena.map,
      entities: (state) => state.arena.entities,
      active: (state) => state.arena.activeRegister,
      plannedPath: (state) => state.arena.plannedPath,
      shapeOnMouse: (state) => state.arena.shapeOnMouse,
      playerActive: (state) => state.arena.playerActive,
    }),
  },
};
</script>

<style lang="sass">
.debug-pane
  position: absolute
  left: 0
  z-index: 99
</style>
