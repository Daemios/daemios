<template>
  <div class="entity-list d-flex">
    <ListEntity
      v-for="(address, i) in entityRegistry"
      :key="i"
      :x="address.x"
      :y="address.y"
    />
  </div>
</template>

<script>
import { mapState } from 'vuex';
import ListEntity from '@/components/arena/ListEntity';

export default {
  components: {
    ListEntity,
  },
  computed: {
    ...mapState({
      entityRegistry: (state) => state.arena.entityRegistry,
    }),
  },
};
</script>

<style lang="sass">
.entity-list
  position: absolute
  bottom: 2rem
  right: 0
  padding: 4px
  z-index: 3
  gap: 8px
</style>
