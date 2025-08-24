<template>
  <Item
    :label="label"
    :class="dollSlotClasses"
    :item="safeItem"
    @click="$emit('click')"
  />
</template>

<script setup>
import { computed } from "vue";
import Item from "@/components/inventory/Item.vue";

const props = defineProps({
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
});

defineEmits(["click"]);

const dollSlotClasses = computed(() => ({
  "doll-left": props.left,
  "doll-right": props.right,
}));

const label = computed(() => {
  // support null item gracefully
  return props.item && props.item.slot ? props.item.slot : "";
});

const safeItem = computed(() => props.item || {});
</script>

<style>
.doll-left {
  grid-column: 1;
}
.doll-right {
  grid-column: 4;
}
</style>
