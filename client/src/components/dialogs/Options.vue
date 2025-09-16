<template>
  <BasicDialog
    v-model="isOptionsOpen"
    title="Options"
    keybind="Esc"
    :max-width="600"
  >
    <v-container fluid class="pa-0">
      <v-row>
        <v-col cols="12">
          <v-expansion-panels multiple>
            <v-expansion-panel title="General">
              <v-expansion-panel-text>
                <!-- Add general settings here -->
                <div class="text-grey">No general settings yet.</div>
              </v-expansion-panel-text>
            </v-expansion-panel>
            <v-expansion-panel title="Audio">
              <v-expansion-panel-text>
                <!-- Add audio settings here -->
                <div class="text-grey">No audio settings yet.</div>
              </v-expansion-panel-text>
            </v-expansion-panel>
            <v-expansion-panel title="Graphics">
              <v-expansion-panel-text>
                <!-- Add graphics settings here -->
                <div class="text-grey">No graphics settings yet.</div>
              </v-expansion-panel-text>
            </v-expansion-panel>
            <!-- Add more categories as needed -->
            <v-expansion-panel title="World Map">
              <v-expansion-panel-text>
                <div class="mb-2 font-weight-bold">Water</div>
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
import BasicDialog from "@/components/dialogs/BasicDialog.vue";
import { useDialogsStore } from "@/stores/dialogsStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { computed } from "vue";

const dialogsStore = useDialogsStore();
const settingsStore = useSettingsStore();
const isOptionsOpen = computed({
  get: () => dialogsStore.isSettingsOpen,
  set: (v) => (dialogsStore.isSettingsOpen = v),
});

const waterEnabled = computed({
  get: () => settingsStore.get("worldMap.features.water", true),
  set: (v) =>
    settingsStore.setAtPath({ path: "worldMap.features.water", value: v }),
});

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
