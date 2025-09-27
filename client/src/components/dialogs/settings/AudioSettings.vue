<template>
  <div>
    <div class="text-h6 mb-2">Audio</div>
    <div class="mb-1 mt-1 text-body-1 font-weight-medium">Volume</div>
    <div class="d-flex align-center my-2">
      <v-slider
        v-model="masterVolume"
        min="0"
        max="1"
        step="0.01"
        label="Master"
        class="flex-grow-1"
        thumb-label
        color="primary"
        style="margin-left: 0; padding-left: 0"
        hide-details
        :messages="''"
      />
      <v-btn
        icon
        size="small"
        class="ml-2"
        @click="muteMaster = !muteMaster"
        :color="muteMaster ? 'red' : 'grey'"
        variant="text"
      >
        <v-icon size="small">{{ muteMaster ? mdiVolumeOff : mdiVolumeHigh }}</v-icon>
      </v-btn>
    </div>
    <div class="d-flex align-baseline my-2 ml-0.5" style="min-height: 36px">
      <span class="pl-6 py-0 text-body-2" style="width: 140px; min-width: 110px; max-width: 140px; display: inline-block;">Tile Ambiance</span>
      <v-slider v-model="tileAmbianceVolume" min="0" max="1" step="0.01" density="compact" class="flex-grow-1 pl-4" thumb-label color="secondary" hide-details />
      <v-btn icon size="small" class="ml-2" @click="muteTileAmbiance = !muteTileAmbiance" :color="muteTileAmbiance ? 'red' : 'grey'" variant="text">
        <v-icon size="small">{{ muteTileAmbiance ? mdiVolumeOff : mdiVolumeHigh }}</v-icon>
      </v-btn>
    </div>
    <div class="d-flex align-baseline my-2 ml-0.5" style="min-height: 36px">
      <span class="pl-6 py-0 text-body-2" style="width: 140px; min-width: 110px; max-width: 140px; display: inline-block;">Combat</span>
      <v-slider v-model="combatVolume" min="0" max="1" step="0.01" density="compact" class="flex-grow-1 pl-4" thumb-label color="secondary" hide-details />
      <v-btn icon size="small" class="ml-2" @click="muteCombat = !muteCombat" :color="muteCombat ? 'red' : 'grey'" variant="text">
        <v-icon size="small">{{ muteCombat ? mdiVolumeOff : mdiVolumeHigh }}</v-icon>
      </v-btn>
    </div>
    <v-divider class="my-4" />
    <div class="mb-1 mt-1 text-body-1 font-weight-medium">Notifications</div>
    <v-switch v-model="turnAlert" label="Turn Alert" color="primary" class="mt-1" />
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useSettingsStore } from '@/stores/settingsStore';
import { mdiVolumeHigh, mdiVolumeOff } from '@mdi/js';

const settingsStore = useSettingsStore();

const muteMaster = computed({
  get: () => settingsStore.get('audio.muteMaster', false),
  set: (v) => settingsStore.setAtPath({ path: 'audio.muteMaster', value: v }),
});
const muteTileAmbiance = computed({
  get: () => settingsStore.get('audio.muteTileAmbiance', false),
  set: (v) => settingsStore.setAtPath({ path: 'audio.muteTileAmbiance', value: v }),
});
const muteCombat = computed({
  get: () => settingsStore.get('audio.muteCombat', false),
  set: (v) => settingsStore.setAtPath({ path: 'audio.muteCombat', value: v }),
});
const turnAlert = computed({
  get: () => settingsStore.get('audio.turnAlert', true),
  set: (v) => settingsStore.setAtPath({ path: 'audio.turnAlert', value: v }),
});
const masterVolume = computed({
  get: () => settingsStore.get('audio.master', 1),
  set: (v) => settingsStore.setAtPath({ path: 'audio.master', value: v }),
});
const tileAmbianceVolume = computed({
  get: () => settingsStore.get('audio.tileAmbiance', 1),
  set: (v) => settingsStore.setAtPath({ path: 'audio.tileAmbiance', value: v }),
});
const combatVolume = computed({
  get: () => settingsStore.get('audio.combat', 1),
  set: (v) => settingsStore.setAtPath({ path: 'audio.combat', value: v }),
});
</script>
