<template>
  <v-dialog
    width="900"
    content-class="overflow-hidden"
  >
    <template #activator="{ props }">
      <div
        class="list-entity rounded"
        :class="entityClasses"
        @mouseover="entityMouseOver"
        @mouseleave="entityMouseOut"
        v-bind="props"
      >
        <div class="background-container overflow-hidden rounded">
          <v-img
            height="130"
            width="60"
            :src="entities[x][y].img"
            class="overflow-hidden"
          />
        </div>
        <div
          class="turn-active-indicator"
          :class="turnActiveClasses"
        />
        <div
          class="control-indicator"
          :class="controlClasses"
        />
      </div>
    </template>
    <v-card class="list-entity-dialog-card">
      <v-card-text class="pa-0 d-flex">
        <v-row no-gutters>
          <v-col cols="7">
            <v-img :src="entities[x][y].img" />
          </v-col>
          <v-col
            cols="5"
            class="d-flex"
          >
            <div class="panel-blend" />
            <div class="panel py-6 px-6">
              <div class="effects">
                <h3 class="mb-2">
                  Effects
                </h3>
                <v-chip
                  v-for="(effect, i) in entities[x][y].effects"
                  :key="i"
                  class="mr-2 mb-2"
                >
                  <v-icon>{{ effect.icon }}</v-icon> 5
                </v-chip>
              </div>

              <v-divider class="my-2" />
              <div class="log">
                <h3 class="mt-3 mb-2 text-center">
                  Log
                </h3>
                <div
                  v-for="(turn, i) in entities[x][y].log"
                  :key="i"
                  class="entry mb-2"
                >
                  <h4 class="mb-2">
                    Turn {{ turn.turn }}
                  </h4>
                  <div
                    v-for="(entry, j) in turn.entries"
                    :key="j"
                    class="entry mb-2"
                  >
                    {{ entities[x][y].name }} {{ entry.message }}
                  </div>
                </div>
              </div>
            </div>
          </v-col>
        </v-row>

      </v-card-text>
  </v-card>
  </v-dialog>
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

const entityClasses = computed(() => ({
  active: entities.value[props.x][props.y].active,
  hover: entities.value[props.x][props.y].hover,
}));

const controlClasses = computed(() => ({
  enemy: entities.value[props.x][props.y].faction === 'enemy',
  ally: entities.value[props.x][props.y].faction === 'ally',
  player: entities.value[props.x][props.y].faction === 'player',
}));

const turnActiveClasses = computed(() => ({
  'turn-active': entities.value[props.x][props.y].active,
}));

function entityMouseOver() {
  arenaStore.entityMouseOver({ x: props.x, y: props.y });
}

function entityMouseOut() {
  arenaStore.entityMouseOut({ x: props.x, y: props.y });
}
</script>

<style>
.list-entity-dialog-card { position: relative; }
.list-entity-dialog-card .panel-blend {
  width: 10%;
  margin-left: -8%;
  background: linear-gradient(90deg, rgba(9,9,121,0) 0%, rgba(255,255,255,1) 90%);
  z-index: 2;
}
.list-entity { width: 60px; height: 100px; transition: all .2s; position: relative; cursor: pointer; }
.list-entity.active { transform: translateY(-10px); box-shadow: 0 0 10px 1px #FFD700; }
.list-entity.hover:not(.active) { transform: translateY(-5px); box-shadow: 0 0 10px 1px #FFF; }
.list-entity .background-container { width: 100%; height: 100%; }
.list-entity .control-indicator {
  border-radius: 50%;
  width: calc(100px * .2);
  height: calc(100px * .2);
  position: absolute;
  border: 2px solid black;
  right: calc(100px * 0.04);
  top: calc(100px - (100px * .2) - (100px * 0.04));
}
.list-entity .turn-active-indicator { clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%); width: 10px; height: 10px; left: calc(50% - 5px); top: -8px; position: absolute; }
</style>
