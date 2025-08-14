<template>
  <div
    class="entity"
    :class="classes"
    @mouseover="entityMouseOver"
    @mouseout="entityMouseOut"
  >
    <div
      v-if="entities[x][y].active"
      class="active-arrow-container d-flex justify-center"
    >
      <div
        class="active-arrow turn-active"
      />
    </div>
    <div class="background overflow-hidden">
      <v-img
        :src="entities[x][y].img"
      />
    </div>
  </div>
</template>
<script setup>
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useArenaStore } from '@/stores/arenaStore';

const props = defineProps({
  x: { type: Number, required: true },
  y: { type: Number, required: true },
});

const arenaStore = useArenaStore();
const { entities } = storeToRefs(arenaStore);

const classes = computed(() => ({
  active: entities.value[props.x][props.y].active,
  hover: entities.value[props.x][props.y].hover,
  enemy: entities.value[props.x][props.y].faction === 'enemy',
  ally: entities.value[props.x][props.y].faction === 'ally',
  player: entities.value[props.x][props.y].faction === 'player',
}));

function entityMouseOver() {
  arenaStore.entityMouseOver({ x: props.x, y: props.y });
}

function entityMouseOut() {
  arenaStore.entityMouseOut({ x: props.x, y: props.y });
}
</script>

<style>
@keyframes active-entity {
  0% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 1); }
  50% { box-shadow: 0 0 0 7px rgba(255, 255, 255, 0); }
  70% { box-shadow: 0 0 0 10px rgba(255, 255, 255, 0); }
  100% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0); }
}
@keyframes active-entity-arrow { 0% { margin-top: -150%; } 50% { margin-top: -200%; } 100% { margin-top: -150%; } }
@keyframes active-entity-arrow-container {
  0% { margin-top: -150%; filter: drop-shadow(-1px 6px 1px rgba(50, 50, 0, 1)); }
  50% { margin-top: -200%; filter: drop-shadow(-1px 20px 8px rgba(50, 50, 0, 1)); }
  100% { margin-top: -150%; filter: drop-shadow(-1px 6px 1px rgba(50, 50, 0, 1)); }
}
.entity {
  border: 2px solid black;
  border-radius: 50%;
  height: 80%;
  width: 80%;
  cursor: pointer;
  z-index: 2;
  position: relative;
}
.entity.hover { box-shadow: 0 0 10px 1px #FFF; }
.entity .background { border-radius: 50%; height: 100%; width: 100%; }
.entity .active-arrow-container { position: absolute; top: 80%; width: 100%; animation: active-entity-arrow-container 2s infinite; }
.entity .active-arrow-container .active-arrow { clip-path: polygon(50% 100%, 100% 0, 65% 0, 50% 25%, 35% 0, 0 0); width: 20px; height: 20px; }
</style>
