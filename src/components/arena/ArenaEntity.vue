<template>
  <div
    class="entity"
    :class="classes"
    @mouseover.self="$emit('entity-mouseover')"
    @mouseout.self="$emit('entity-mouseout')"
  >
    <div
      v-if="entity.active"
      class="active-arrow-container d-flex justify-center"
    >
      <div
        class="active-arrow turn-active"
      />
    </div>
    <div class="background overflow-hidden">
      <v-img
        :src="entity.img"
      />
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
  cursor: pointer
  z-index: $entity-index
  position: relative

  .background
    border-radius: 50%
    height: 100%
    width: 100%

  .active-arrow-container
    position: absolute
    top: 80%
    width: 100%
    animation: active-entity-arrow-container 2s infinite

    .active-arrow
      clip-path: polygon(50% 100%, 100% 0, 65% 0, 50% 25%, 35% 0, 0 0)
      width: 20px
      height: 20px

</style>
