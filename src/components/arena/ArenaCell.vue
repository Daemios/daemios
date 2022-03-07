<template>
  <div
    class="cell"
    :class="cellClasses"
    oncontextmenu="return false"
    @click="$emit('click')"
  >
    <!-- Overlays -->
    <div
      v-if="cell.overlays['validDestination'] && cell.passable"
      class="overlay destination-overlay"
    />
    <div
      v-if="cell.overlays['targeting'] && cell.passable"
      class="overlay targeting-overlay"
    />

    <div
      v-if="entities && entities.length"
      class="entities"
      @mouseover.self="$emit('cell-mouseover')"
      @mouseout.self="$emit('cell-mouseout')"
    >
      <ArenaEntity
        v-for="entity in entities[x][y]"
        :key="entity.id"
        :x="x"
        :y="y"
      />
    </div>
  </div>
</template>
<script>
import { mapState } from 'vuex';
import ArenaEntity from '@/components/arena/ArenaEntity';

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
  computed: {
    ...mapState({
      entities: (state) => state.arena.entities,
    }),
    cellClasses() {
      const classes = {
        impassable: !this.cell.passable,
      };

      // efficient way to assign variable terrain types but still
      // take the impassable property into account to avoid rendering
      // impassable cell backgrounds
      classes[this.cell.terrain] = this.cell.passable;

      return classes;
    },
  },
};
</script>

<style lang="sass">
$grass: darken(green, 10%)
$water: darken(teal, 10%)
$stone: darken(grey, 10%)

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

    &.targeting-overlay
      background: orangered

  &.grass
    background: $grass

    &:hover
      background: lighten($grass, 10%)

  &.water
    background: $water

    &:hover
      background: lighten($water, 10%)

  &.stone
    background: $stone

    &:hover
      background: lighten($stone, 10%)

  .entities
    height: 100%
    width: 100%
    display: flex
    justify-content: center
    align-items: center
    position: relative
    z-index: $cell-index

</style>
