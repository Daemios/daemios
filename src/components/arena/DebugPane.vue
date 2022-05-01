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
import { mapState } from 'vuex';

export default {
  computed: {
    ...mapState({
      map: (state) => state.arena.map,
      entities: (state) => state.arena.entities,
      entityRegistry: (state) => state.arena.entityRegistry,
      active: (state) => state.arena.activeRegister,
      plannedPath: (state) => state.arena.plannedPath,
      shapeOnMouse: (state) => state.arena.shapeOnMouse,
      playerActive: (state) => state.arena.playerActive,
    }),
  },
  methods: {
    cycleActive() {
      let newActive = {};
      const index = this.active.index + 1;
      if (index < this.entityRegistry.length) {
        newActive = {
          x: this.entityRegistry[index].x,
          y: this.entityRegistry[index].y,
          index,
        };
      } else {
        newActive = {
          x: this.entityRegistry[0].x,
          y: this.entityRegistry[0].y,
          index: 0,
        };
      }
      this.$store.commit('arena/setActive', newActive);
    },
  },
};
</script>

<style lang="sass">
.debug-pane
  position: absolute
  left: 0
  z-index: 99
</style>
