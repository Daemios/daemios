<template>
  <div class="turn-indicator d-flex align-center justify-center">
    <div class="turn-indicator-content">
      <v-sheet class="name pa-2 rounded">
        <h1>{{ entities[active.x][active.y].name }}</h1>
      </v-sheet>
      <div class="next-2 rounded">
        <v-img
          :lazy-src="nextEntity(2).img"
          :src="nextEntity(2).img"
          eager
        />
      </div>
      <div class="next rounded">
        <v-img
          :lazy-src="nextEntity(1).img"
          :src="nextEntity(1).img"
          eager
        />
      </div>
      <div class="current rounded">
        <v-img
          :lazy-src="entities[active.x][active.y].img"
          :src="entities[active.x][active.y].img"
          eager
        />
      </div>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex';

export default {
  computed: {
    ...mapState({
      entities: (state) => state.arena.entities,
      active: (state) => state.arena.activeRegister,
      entityRegistry: (state) => state.arena.entityRegistry,
    }),
  },
  methods: {
    nextEntity(offset = 1) {
      const registry_entry = this.entityRegistry[
        (this.active.index + offset) % this.entityRegistry.length
      ];

      return this.entities[registry_entry.x][registry_entry.y];
    },
  },
};
</script>

<style lang="sass">
.turn-indicator
  position: absolute
  width: 100%
  height: 100%
  background-color: rgba(0,0,0,.1)
  z-index: 2
  color: white

.turn-indicator-content
  position: relative
  width: 30vw

  .name
    position: absolute
    width: 100%

  .current, .next, .next-2
    position: absolute
    top: 10px
    right: 0
    width: 120px
    height: 200px
    overflow: hidden
    margin-left: 0
    margin-top: -100px // height of image
    border: 2px solid white

    .v-image
      height: 100%

  .current
    transform: rotate(2deg)

  .next
    right: -60px
    transform: rotate(15deg)
    top: 20px

  .next-2
    right: -7vw
    transform: rotate(35deg)
    top: 36px

</style>
