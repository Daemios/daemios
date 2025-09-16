<template>
  <BasicDialog
    v-model="isSettingsOpen"
    title="Settings"
    keybind="Esc"
    :max-width="600"
  >
    <v-container fluid class="pa-0">
      <v-row>
        <v-col cols="12">
          <v-expansion-panels
            v-model="expandedPanels"
            multiple
            class="border rounded ma-0 pa-0"
            elevation="0"
          >
            <v-expansion-panel elevation="0" class="border-b">
              <template #title>
                <span class="text-primary font-weight-bold text-h6"
                  >General</span
                >
              </template>
              <v-expansion-panel-text>
                <!-- Add general settings here -->
                <div class="text-grey">No general settings yet.</div>
              </v-expansion-panel-text>
            </v-expansion-panel>
            <v-expansion-panel elevation="0" class="border-b">
              <template #title>
                <span class="text-primary font-weight-bold text-h6">Audio</span>
              </template>
              <v-expansion-panel-text>
                <div class="mb-1 mt-1 text-body-1 font-weight-medium">
                  Volume
                </div>
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
                    <v-icon size="small">
                      {{ muteMaster ? mdiVolumeOff : mdiVolumeHigh }}
                    </v-icon>
                  </v-btn>
                </div>
                <div
                  class="d-flex align-baseline my-2 ml-0.5"
                  style="min-height: 36px"
                >
                  <span
                    class="pl-6 py-0 text-body-2"
                    style="
                      width: 140px;
                      min-width: 110px;
                      max-width: 140px;
                      display: inline-block;
                    "
                    >Tile Ambiance</span
                  >
                  <v-slider
                    v-model="tileAmbianceVolume"
                    min="0"
                    max="1"
                    step="0.01"
                    density="compact"
                    class="flex-grow-1 pl-4"
                    thumb-label
                    color="secondary"
                    hide-details
                  />
                  <v-btn
                    icon
                    size="small"
                    class="ml-2"
                    @click="muteTileAmbiance = !muteTileAmbiance"
                    :color="muteTileAmbiance ? 'red' : 'grey'"
                    variant="text"
                  >
                    <v-icon size="small">
                      {{ muteTileAmbiance ? mdiVolumeOff : mdiVolumeHigh }}
                    </v-icon>
                  </v-btn>
                </div>
                <div
                  class="d-flex align-baseline my-2 ml-0.5"
                  style="min-height: 36px"
                >
                  <span
                    class="pl-6 py-0 text-body-2"
                    style="
                      width: 140px;
                      min-width: 110px;
                      max-width: 140px;
                      display: inline-block;
                    "
                    >Combat</span
                  >
                  <v-slider
                    v-model="combatVolume"
                    min="0"
                    max="1"
                    step="0.01"
                    density="compact"
                    class="flex-grow-1 pl-4"
                    thumb-label
                    color="secondary"
                    hide-details
                  />
                  <v-btn
                    icon
                    size="small"
                    class="ml-2"
                    @click="muteCombat = !muteCombat"
                    :color="muteCombat ? 'red' : 'grey'"
                    variant="text"
                  >
                    <v-icon size="small">
                      {{ muteCombat ? mdiVolumeOff : mdiVolumeHigh }}
                    </v-icon>
                  </v-btn>
                </div>
                <v-divider class="my-4" />
                <div class="mb-1 mt-1 text-body-1 font-weight-medium">
                  Notifications
                </div>
                <v-switch
                  v-model="turnAlert"
                  label="Turn Alert"
                  color="primary"
                  class="mt-1"
                />
              </v-expansion-panel-text>
            </v-expansion-panel>
            <v-expansion-panel elevation="0">
              <template #title>
                <span class="text-primary font-weight-bold text-h6"
                  >Graphics</span
                >
              </template>
              <v-expansion-panel-text>
                <!-- Add graphics settings here -->
                <div class="mb-1 mt-1 text-body-1 font-weight-medium">
                  General
                </div>
                <div class="text-grey mb-4">No graphics settings yet.</div>
                <v-divider class="my-4" />
                <div class="mb-1 mt-1 text-body-1 font-weight-medium">
                  World Map
                </div>
                <v-switch
                  v-model="waterEnabled"
                  label="Render Water"
                  color="primary"
                  hide-details
                />
                <v-select
                  v-model="waterMaterial"
                  :items="materialOptions"
                  item-title="text"
                  item-value="value"
                  label="Water Material"
                  dense
                  hide-details
                />
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </v-col>
      </v-row>
    </v-container>
  </BasicDialog>
</template>

<script setup>
// Mute toggles for each slider
const muteMaster = computed({
  get: () => settingsStore.get("audio.muteMaster", false),
  set: (v) => settingsStore.setAtPath({ path: "audio.muteMaster", value: v }),
});
const muteTileAmbiance = computed({
  get: () => settingsStore.get("audio.muteTileAmbiance", false),
  set: (v) =>
    settingsStore.setAtPath({ path: "audio.muteTileAmbiance", value: v }),
});
const muteCombat = computed({
  get: () => settingsStore.get("audio.muteCombat", false),
  set: (v) => settingsStore.setAtPath({ path: "audio.muteCombat", value: v }),
});
// Turn alert switch
const turnAlert = computed({
  get: () => settingsStore.get("audio.turnAlert", true),
  set: (v) => settingsStore.setAtPath({ path: "audio.turnAlert", value: v }),
});
// Audio volume settings
const masterVolume = computed({
  get: () => settingsStore.get("audio.master", 1),
  set: (v) => settingsStore.setAtPath({ path: "audio.master", value: v }),
});
const tileAmbianceVolume = computed({
  get: () => settingsStore.get("audio.tileAmbiance", 1),
  set: (v) => settingsStore.setAtPath({ path: "audio.tileAmbiance", value: v }),
});
const combatVolume = computed({
  get: () => settingsStore.get("audio.combat", 1),
  set: (v) => settingsStore.setAtPath({ path: "audio.combat", value: v }),
});
import BasicDialog from "@/components/dialogs/BasicDialog.vue";

// Use the same pattern as MicroMenu: import SVG path data from @mdi/js and
// place the path string inside the <v-icon> content. This ensures Vuetify's
// mdi-svg iconset renders the correct SVG and avoids passing font names where
// a path is expected.
import { mdiVolumeHigh, mdiVolumeOff } from "@mdi/js";

import { useDialogsStore } from "@/stores/dialogsStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { computed } from "vue";

const dialogsStore = useDialogsStore();
const settingsStore = useSettingsStore();
const isSettingsOpen = computed({
  get: () => dialogsStore.isSettingsOpen,
  set: (v) => (dialogsStore.isSettingsOpen = v),
});

// Persisted expansion panel state
const expandedPanels = computed({
  get: () => settingsStore.get("ui.settingsPanel.expanded", []),
  set: (val) =>
    settingsStore.setAtPath({ path: "ui.settingsPanel.expanded", value: val }),
});

const waterEnabled = computed({
  get: () => settingsStore.get("worldMap.features.water", true),
  set: (v) =>
    settingsStore.setAtPath({ path: "worldMap.features.water", value: v }),
});

// Water material options and persisted selection
const materialOptions = [
  { text: "Realistic", value: "realistic" },
  { text: "Ghibli (stylized)", value: "ghibli" },
  { text: "Shadertoy", value: "shadertoy" },
];

const waterMaterial = computed({
  get: () => settingsStore.get("worldMap.features.waterMaterial", "realistic"),
  set: (v) =>
    settingsStore.setAtPath({
      path: "worldMap.features.waterMaterial",
      value: v,
    }),
});
</script>
