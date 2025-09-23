<template>
  <div class="inventory-grid-root">
    <div class="inventory-grid">
      <div v-for="slot in slots" :key="slot.index" class="inventory-slot">
        <div v-if="slot.item" class="slot-item">
          <img v-if="slot.item.image" :src="slot.item.image" alt="item" />
          <div class="item-name">
            {{ slot.item.name }}
          </div>
          <div v-if="slot.item.quantity > 1" class="item-qty">
            x{{ slot.item.quantity }}
          </div>
        </div>
        <div v-else class="slot-empty">&nbsp;</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  container: {
    type: Object,
    required: true,
  },
});

const slots = computed(() => {
  const capacity = props.container?.capacity || 0;
  const itemsByIndex = {};
  (props.container?.items || []).forEach((it) => {
    if (typeof it.containerIndex === "number")
      itemsByIndex[it.containerIndex] = it;
  });

  return Array.from({ length: Math.max(capacity, 1) }).map((_, idx) => ({
    index: idx,
    item: itemsByIndex[idx] || null,
  }));
});
</script>

<style scoped>
.inventory-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(64px, 1fr));
  gap: 6px;
}
.inventory-slot {
  border: 1px dashed rgba(0, 0, 0, 0.12);
  min-height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.02);
  padding: 4px;
}
.slot-item img {
  max-width: 100%;
  max-height: 36px;
  display: block;
  margin: 0 auto;
}
.item-name {
  font-size: 0.75rem;
  text-align: center;
}
.item-qty {
  font-size: 0.7rem;
  text-align: center;
}
.slot-empty {
  opacity: 0.25;
}
</style>
