<template>
  <div
    class="entity"
    :class="classes"
    @mouseover.self="$emit('entity-mouseover')"
    @mouseout.self="$emit('entity-mouseout')"
  >
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
      let string = this.entity.faction;
      if (this.activeEntityId === this.entity.id) {
        string += ' active';
      }
      return string;
    },
  },
};
</script>
<style lang="sass">

</style>
