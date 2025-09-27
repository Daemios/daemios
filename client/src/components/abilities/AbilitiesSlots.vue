<template>
  <div class="abilities-root d-flex">
    <SlotCell
      v-for="s in slots"
      :key="s.id"
      :slot-id="s.id"
      type="ability"
      :item="s.item"
      :label="s.label"
      @dropped="onDropped"
      @click="onClick"
    />
  </div>
</template>

<script setup>
import SlotCell from '@/components/shared/SlotCell.vue';
import { reactive } from 'vue';

const emit = defineEmits(['ability-drop', 'ability-click']);

// simple local placeholder for three ability slots; parent can pass real data
const slots = reactive([
  { id: 'ability1', label: 'Ability 1', item: null },
  { id: 'ability2', label: 'Ability 2', item: null },
  { id: 'ability3', label: 'Ability 3', item: null },
]);

function onDropped(payload) {
  emit('ability-drop', payload);
}

function onClick(item) {
  emit('ability-click', item);
}
</script>

<style scoped>
.abilities-root { gap: 8px; }
.abilities-root > * { width: 96px; }
</style>
