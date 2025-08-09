<template>
  <div class="d-flex justify-center align-center w-100 h-100 position-relative">
    <ArenaScene class="w-100 h-100" />
    <ListEntityList />
    <TurnIndicator v-if="showTurn" />
    <DebugPane v-if="debug" />
  </div>
</template>

<script setup>
import { storeToRefs } from 'pinia';
import ArenaScene from '@/components/arena/ArenaScene.vue';
import ListEntityList from '@/components/arena/ListEntityList.vue';
import TurnIndicator from '@/components/arena/TurnIndicator.vue';
import DebugPane from '@/components/arena/DebugPane.vue';
import { useArenaStore } from '@/stores/arenaStore';

const store = useArenaStore();
const { showTurn, debug } = storeToRefs(store);
</script>

