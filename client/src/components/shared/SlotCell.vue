<template>
  <!-- Compatibility wrapper: forward to new Slot component -->
  <Slot
    :item="item"
    :label="label"
    :slot-id="slotId"
    :type="type"
    :small="small"
    :source="source"
    @dropped="$emit('dropped', $event)"
    @click="$emit('click', $event)"
  />
</template>

<script setup>
import Slot from "./Slot.vue";
defineEmits(["click", "dropped"]);
</script>

<style scoped>
/* empty: styling now lives on Slot.vue */
</style>
