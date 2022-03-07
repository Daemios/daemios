<template>
  <div class="entity-list d-flex">
    <ListEntity
      v-for="(entity, i) in entities"
      :key="i"
      :entity="entity"
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
      entities: (state) => state.arena.entities,
    }),
  },
};
</script>
