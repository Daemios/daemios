<template>
  <v-dialog
    width="900"
    content-class="overflow-hidden"
  >
    <template #activator="{ attrs, on }">
      <div
        class="list-entity rounded"
        :class="entityClasses"
        @mouseover="entityMouseOver"
        @mouseleave="entityMouseOut"
        v-on="on"
      >
        <div class="background-container overflow-hidden rounded">
          <v-img
            height="130"
            width="60"
            :src="entities[x][y].img"
            class="overflow-hidden"
          />
        </div>
        <div
          class="turn-active-indicator"
          :class="turnActiveClasses"
        />
        <div
          class="control-indicator"
          :class="controlClasses"
        />
      </div>
    </template>
    <v-card class="list-entity-dialog-card">
      <v-card-text class="pa-0 d-flex">
        <v-row no-gutters>
          <v-col cols="7">
            <v-img :src="entities[x][y].img" />
          </v-col>
          <v-col
            cols="5"
            class="d-flex"
          >
            <div class="panel-blend" />
            <div class="panel py-6 px-6">
              <div class="effects">
                <h3 class="mb-2">
                  Effects
                </h3>
                <v-chip
                  v-for="(effect, i) in entities[x][y].effects"
                  :key="i"
                  class="mr-2 mb-2"
                >
                  <v-icon>{{ effect.icon }}</v-icon> 5
                </v-chip>
              </div>

              <v-divider class="my-2" />
              <div class="log">
                <h3 class="mt-3 mb-2 text-center">
                  Log
                </h3>
                <div
                  v-for="(turn, i) in entities[x][y].log"
                  :key="i"
                  class="entry mb-2"
                >
                  <h4 class="mb-2">
                    Turn {{ turn.turn }}
                  </h4>
                  <div
                    v-for="(entry, j) in turn.entries"
                    :key="j"
                    class="entry mb-2"
                  >
                    {{ entities[x][y].name }} {{ entry.message }}
                  </div>
                </div>
              </div>
            </div>
          </v-col>
        </v-row>

      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script>
import { mapState } from 'vuex';

export default {
  props: {
    x: {
      type: Number,
      required: true,
    },
    y: {
      type: Number,
      required: true,
    },
  },
  computed: {
    entityClasses() {
      return {
        active: this.entities[this.x][this.y].active,
        hover: this.entities[this.x][this.y].hover,
      };
    },
    controlClasses() {
      return {
        enemy: this.entities[this.x][this.y].faction === 'enemy',
        ally: this.entities[this.x][this.y].faction === 'ally',
        player: this.entities[this.x][this.y].faction === 'player',
      };
    },
    turnActiveClasses() {
      return {
        'turn-active': this.entities[this.x][this.y].active,
      };
    },
    ...mapState({
      entities: (state) => state.arena.entities,
    }),
  },
  methods: {
    entityMouseOver() {
      this.$store.commit('arena/entityMouseOver', { x: this.x, y: this.y });
    },
    entityMouseOut() {
      this.$store.commit('arena/entityMouseOut', { x: this.x, y: this.y });
    },
  },
};
</script>

<style lang="sass">
$width: 60px
$height: 100px

.list-entity-dialog-card
  position: relative

  .panel-blend
    width: 10%
    margin-left: -8%
    background: green
    background: linear-gradient(90deg, rgba(9,9,121,0) 0%, rgba(255,255,255,1) 90%)
    z-index: 2

.list-entity
  width: $width
  height: $height
  transition: all .2s
  position: relative
  cursor: pointer

  &.active
    transform: translateY(-10px)
    box-shadow: 0 0 10px 1px #FFD700

  &.hover:not(.active)
    transform: translateY(-5px)
    box-shadow: 0 0 10px 1px #FFF

  .background-container
    width: 100%
    height: 100%

  .control-indicator
    border-radius: 50%
    width: calc(#{$height} * .2) // intentionally uses height to build an even circle
    height: calc(#{$height} * .2)
    position: absolute
    border: 2px solid black
    right: calc((#{$height} * 0.04))
    top: calc(#{$height} - ((#{$height} * .2)) - (#{$height} * 0.04))

  .turn-active-indicator
    clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)
    width: 10px
    height: 10px
    left: calc(50% - 5px)
    top: -8px
    position: absolute

</style>
