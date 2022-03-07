<template>
  <div
    class="entity"
    :class="classes"
    @mouseover.self="$emit('entity-mouseover')"
    @mouseout.self="$emit('entity-mouseout')"
  >
    <div
      v-if="activeEntityId === entity.id"
      class="active-arrow-container"
    >
      <div
        class="active-arrow"
      />
    </div>
    <div class="nameplate">
      {{ entity.name }}
    </div>
    <div class="stats">
      <div
        class="ap"
        @mouseover.self="$emit('entity-mouseover')"
        @mouseout.self="$emit('entity-mouseout')"
      >
        {{ entity.ap.current }}
      </div>
      <div
        class="mp"
        @mouseover.self="$emit('entity-mouseover')"
        @mouseout.self="$emit('entity-mouseout')"
      >
        {{ entity.mp.current }}
      </div>
    </div>
    <div
      v-if="false"
      class="hp"
    >
      {{ entity.life.current }}|{{ entity.life.max }}
    </div>
  </div>
</template>
<script>
import { mapState } from 'vuex';

export default {
  props: {
    entity: {
      type: Object,
      required: true,
    },
  },
  computed: {
    ...mapState({
      activeEntityId: (state) => state.arena.activeEntityId,
    }),
    classes() {
      return {
        active: this.entity.active,
        enemy: this.entity.faction === 'enemy',
        ally: this.entity.faction === 'ally',
        player: this.entity.faction === 'player',
      };
    },
  },
};
</script>

<style lang="sass">
$entity-index: 2
$tooltip-index: 3

@keyframes active-entity
  0%
    box-shadow: 0 0 0 0 rgba(255, 255, 255, 1)

  50%
    box-shadow: 0 0 0 7px rgba(255, 255, 255, 0)

  70%
    box-shadow: 0 0 0 10px rgba(255, 255, 255, 0)

  100%
    box-shadow: 0 0 0 0 rgba(255, 255, 255, 0)

@keyframes active-entity-arrow
  0%
    margin-top: -150%
  50%
    margin-top: -200%
  100%
    margin-top: -150%

@keyframes active-entity-arrow-container
  0%
    margin-top: -150%
    filter: drop-shadow(-1px 6px 1px rgba(50, 50, 0, 1))
  50%
    margin-top: -200%
    filter: drop-shadow(-1px 20px 8px rgba(50, 50, 0, 1))
  100%
    margin-top: -150%
    filter: drop-shadow(-1px 6px 1px rgba(50, 50, 0, 1))

@mixin active-entity
  animation: active-entity 2s infinite

.entity
  border: 2px solid black
  border-radius: 50%
  height: 80%
  width: 80%
  display: flex
  justify-content: center
  align-items: center
  cursor: pointer
  z-index: $entity-index

  &:hover > .stats
    display: grid !important

  &:hover > .nameplate, &:hover > .hp
    display: flex !important

  .active-arrow-container
    position: absolute
    width: 50%
    height: 50%
    margin-top: -400%
    animation: active-entity-arrow-container 2s infinite

    .active-arrow
      background-color: red
      clip-path: polygon(50% 100%, 100% 0, 65% 0, 50% 25%, 35% 0, 0 0)
      width: 100%
      height: 100%

  .nameplate, .stats
    position: absolute
    font-size: .8rem
    border-radius: .25rem
    padding: 2px 4px
    z-index: $tooltip-index

  .nameplate
    top: -1rem
    display: none
    background: rgba(0, 0, 0, .6)

    .name
      grid-column: 1/3
      white-space: nowrap

  .stats
    bottom: -1rem
    display: none
    grid-template-columns: 1fr 1fr
    grid-gap: .5rem
    justify-content: center
    white-space: nowrap

    .ap, .mp
      text-align: center
      height: 24px
      width: 24px
      border-radius: 50%
      display: flex
      justify-content: center
      align-items: center
      z-index: $tooltip-index

    .ap
      grid-column: 1
      background: blue

    .mp
      grid-column: 2
      background: green

  .hp
    display: none

</style>
