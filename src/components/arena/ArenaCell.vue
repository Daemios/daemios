<template>
  <div
    class="cell"
    :class="cellClasses"
    :style="`background: ${cellColor}`"
    oncontextmenu="return false"
    @click="$emit('click')"
    @mouseenter="hovered = true"
    @mouseleave="hovered = false"
  >
    <!-- Overlays -->
    <div
      v-if="overlays.length && overlays[x][y]['validDestination'] && cell.passable"
      class="overlay destination-overlay"
    />
    <div
      v-if="overlays.length && overlays[x][y]['confirmedPath'] && cell.passable"
      class="overlay confirmed-path-overlay"
    />
    <div
      v-if="overlays.length && overlays[x][y]['targeting'] && cell.passable"
      class="overlay targeting-overlay"
    />
    <div
      v-if="hovered"
      class="overlay hover-overlay"
    />
    <div
      v-if="debug"
      class="overlay d-flex align-center justify-center"
    >
      {{ x }}|{{ y }}
    </div>

    <div
      v-if="entities && entities.length"
      class="entities"
      @mouseover.self="$emit('cell-mouseover')"
      @mouseout.self="$emit('cell-mouseout')"
    >

      <ArenaEntity
        v-if="entities[x][y]"
        :x="x"
        :y="y"
      />
    </div>
  </div>
</template>
<script>
import { useArenaStore } from '@/stores/arenaStore';
import ArenaEntity from '@/components/arena/ArenaEntity.vue';
import cell_colors from '@/mixins/cell_colors';

export default {
  components: {
    ArenaEntity,
  },
  props: {
    cell: {
      type: Object,
      required: true,
    },
    x: {
      type: Number,
      required: true,
    },
    y: {
      type: Number,
      required: true,
    },
  },
  data: () => ({
    hovered: false,
  }),
  computed: {
    entities() { return useArenaStore().entities; },
  overlays() { return useArenaStore().overlays; },
  debug() { return useArenaStore().debug; },
    cellClasses() {

      const classes = {
        impassable: !this.cell.terrain.passable,
      };

      // efficient way to assign variable terrain types but still
      // take the impassable property into account to avoid rendering
      // impassable cell backgrounds
      classes['grass'] = this.cell.terrain.passable;

      return classes;
    },
    cellColor() {
      // variance adds pleasing variation
      const variance = Math.floor(Math.random() * 10) - 5

      // !passable returns null
      if (!this.cell.terrain.passable) {
        return null;
      }

      let hue;
      let sat;
      let light;

      // moisture determines grass or water
      if (this.cell.terrain.moisture > .7) {
        hue = 205;
        sat = 100;
        light = 40;
      } else {
        hue = 95;
        sat = 100 * this.cell.terrain.flora;
        light = 30;
      }

      return cell_colors.hslToHex(hue, sat, light)
    }
  },
};
</script>

<style lang="sass">
$cell-index: 1

.cell
  box-sizing: border-box
  height: 50px
  width: 50px
  position: relative
  margin: -1px 0 0 -1px
  cursor: pointer

  &:not(.impassable)
    border: 1px solid black

  .overlay
    transition: all .5s
    position: absolute
    height: 100%
    width: 100%

    &.destination-overlay
      background: rgba(82, 189, 34, 1)

    &.confirmed-path-overlay
      background: rgba(100, 100, 255, 1)

    &.targeting-overlay
      background: orangered

    &.hover-overlay
      background: rgba(255,255,255,.1)

  .entities
    height: 100%
    width: 100%
    display: flex
    justify-content: center
    align-items: center
    position: relative
    z-index: $cell-index

</style>
