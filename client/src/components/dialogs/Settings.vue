<template>
  <v-dialog v-model="isSettingsOpen" max-width="980">
    <div
      class="d-flex"
      style="align-items: flex-start; gap: 16px; padding: 12px; height: 70vh"
    >
      <!-- Left selector column (outside the main card) -->
      <div
        class="d-flex flex-column"
        style="
          width: 200px;
          gap: 12px;
          max-height: calc(70vh - 24px);
          overflow: auto;
        "
      >
        <div v-for="item in items" :key="item.key" style="width: 100%">
          <v-card
            :elevation="active === item.key ? 8 : 2"
            class="pa-3 d-flex flex-column"
            :outlined="active !== item.key"
            style="cursor: pointer"
            @click="select(item.key)"
          >
            <div class="text-subtitle-2 font-weight-medium">
              {{ item.title }}
            </div>
          </v-card>
        </div>
      </div>

      <!-- Main dialog card -->
      <v-card
        style="
          min-width: 560px;
          max-width: 720px;
          height: calc(70vh - 24px);
          display: flex;
          flex-direction: column;
        "
      >
        <v-card-title>
          <span class="headline">{{ activeTitle }} Settings (Esc)</span>
        </v-card-title>
        <v-card-text style="overflow: auto; flex: 1">
          <component :is="currentComponent" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="green darken-1" variant="text" @click="close">
            Close
          </v-btn>
        </v-card-actions>
      </v-card>
    </div>
  </v-dialog>
</template>

<script setup>
import { ref, computed } from "vue";
import { useDialogsStore } from "@/stores/dialogsStore";
import GeneralSettings from "./settings/GeneralSettings.vue";
import AudioSettings from "./settings/AudioSettings.vue";
import GraphicsSettings from "./settings/GraphicsSettings.vue";
import KeybindsSettings from "./settings/KeybindsSettings.vue";

const dialogsStore = useDialogsStore();
const isSettingsOpen = computed({
  get: () => dialogsStore.isSettingsOpen,
  set: (v) => (dialogsStore.isSettingsOpen = v),
});

const items = [
  { key: "general", title: "General", subtitle: "Basic options" },
  { key: "audio", title: "Audio", subtitle: "Volume and alerts" },
  { key: "graphics", title: "Graphics", subtitle: "Rendering options" },
  { key: "keybinds", title: "Keybinds", subtitle: "Customize keys" },
];

const active = ref("general");

function select(k) {
  active.value = k;
}

const currentComponent = computed(() => {
  switch (active.value) {
    case "audio":
      return AudioSettings;
    case "graphics":
      return GraphicsSettings;
    case "keybinds":
      return KeybindsSettings;
    default:
      return GeneralSettings;
  }
});

function close() {
  isSettingsOpen.value = false;
}

const activeTitle = computed(() => {
  switch (active.value) {
    case "audio":
      return "Audio";
    case "graphics":
      return "Graphics";
    case "keybinds":
      return "Keybinds";
    default:
      return "General";
  }
});
</script>
