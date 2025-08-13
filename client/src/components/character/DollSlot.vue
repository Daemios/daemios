<template>
  <Item
    :label="item.slot"
    :class="dollSlotClasses"
    :item="item"
    @click="$emit('click')"
  />
</template>

<script>
import Item from '@/components/inventory/Item.vue';

export default {
  components: { Item },
  props: {
    item: {
      type: Object,
      default: null,
    },
    left: {
      type: Boolean,
      default: false,
    },
    right: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
    dollSlotClasses() {
      return {
        'doll-left': this.left,
        'doll-right': this.right,
      };
    },
  },
};
</script>

<style>
.doll-left { grid-column: 1; }
.doll-right { grid-column: 4; }
</style>
