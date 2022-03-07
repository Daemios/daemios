<template>
  <div
    class="list-entity rounded pa-1"
    :class="classes"
  >
    <div class="name">
      {{ entity.name }}
    </div>
    <div class="damage">
      -{{ entity.damage }}
    </div>
    <img
      :src="entity.image"
      alt=""
    >
  </div>
</template>

<script>
export default {
  props: {
    entity: {
      type: Object,
      required: true,
    },
  },
  computed: {
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
.list-entity
  min-width: 60px
  min-height: 100px
  transition: all .5s
  position: relative

  &.active
    transform: translateY(-10px)

  .name
    position: absolute
    width: 100%
    overflow: hidden
    text-overflow: ellipsis

</style>
