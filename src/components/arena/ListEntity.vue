<template>
  <div
    class="list-entity rounded"
    :class="entityClasses"
  >
    <div class="background-container overflow-hidden rounded">
      <v-img
        height="130"
        width="60"
        :src="entities[x][y][0].img"
        class="overflow-hidden"
      />
    </div>
    <div
      class="turn-active-indicator"
      :class="chevronTurnActiveClasses"
    />
    <div
      class="control-indicator"
      :class="controlClasses"
    />
  </div>
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
        active: this.entities[this.x][this.y][0].active,
      };
    },
    controlClasses() {
      return {
        enemy: this.entities[this.x][this.y][0].faction === 'enemy',
        ally: this.entities[this.x][this.y][0].faction === 'ally',
        player: this.entities[this.x][this.y][0].faction === 'player',
      };
    },
    chevronTurnActiveClasses() {
      console.log(this.entities[this.x][this.y][0].active);
      return {
        'turn-active': this.entities[this.x][this.y][0].active,
      };
    },
    ...mapState({
      entities: (state) => state.arena.entities,
    }),
  },
};
</script>

<style lang="sass">
$height: 100px
$width: 60px

.list-entity
  min-width: 60px
  min-height: 100px
  width: 60px
  height: 100px
  transition: all .2s
  position: relative
  cursor: pointer

  &.active
    transform: translateY(-10px)
    box-shadow: 0 0 10px 1px #FFD700

  &:hover:not(.active)
    transform: translateY(-5px)

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
