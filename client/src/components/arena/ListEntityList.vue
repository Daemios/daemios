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

<script setup>
import { storeToRefs } from 'pinia';
import { useArenaStore } from '@/stores/arenaStore';
import ListEntity from '@/components/arena/ListEntity.vue';

const arenaStore = useArenaStore();
const { entityRegistry } = storeToRefs(arenaStore);
</script>

<style>
.entity-list { position: absolute; bottom: 2rem; right: 0; padding: 4px; z-index: 3; gap: 8px; }
</style>
