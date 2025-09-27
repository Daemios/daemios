<template>
  <div>
    <div class="mb-1 mt-1 text-body-1 font-weight-medium">General</div>
    <div class="text-grey mb-4">No general graphics settings yet.</div>

    <v-divider class="my-4" />

    <div class="mb-1 mt-1 text-body-1 font-weight-medium">World Map</div>

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
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useSettingsStore } from "@/stores/settingsStore";

const settingsStore = useSettingsStore();

const waterEnabled = computed({
  get() {
    return settingsStore.get("worldMap.features.water", true);
  },
  set(v) {
    settingsStore.setAtPath({ path: "worldMap.features.water", value: v });
  },
});

const materialOptions = [
  { text: "Realistic", value: "realistic" },
  { text: "Ghibli (stylized)", value: "ghibli" },
  { text: "Shadertoy", value: "shadertoy" },
];

const waterMaterial = computed({
  get() {
    return settingsStore.get("worldMap.features.waterMaterial", "realistic");
  },
  set(v) {
    settingsStore.setAtPath({
      path: "worldMap.features.waterMaterial",
      value: v,
    });
  },
});
</script>
