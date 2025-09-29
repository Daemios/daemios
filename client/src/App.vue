<template>
  <v-app id="app">
    <!-- Game Dialogs -->
    <CharacterPanel />
    <Settings />

    <!-- Main Content -->
    <v-main class="fill-height">
      <router-view class="fill-height" />
    </v-main>

    <!-- Micro menu -->
    <MicroMenu />

    <!-- Websocket lock -->
    <v-dialog :model-value="!socket.connection" persistent max-width="400">
      <v-card class="pa-4">
        <v-card-text class="pa-0 d-flex align-center justify-center">
          <v-progress-circular size="20" indeterminate class="mr-4" />
          Attempting to reconnect to Websocket server...
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Toast notifications -->
    <AppToasts />
  </v-app>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref } from "vue";
import { useRoute } from "vue-router";
import CharacterPanel from "@/components/dialogs/CharacterPanel.vue";
import Settings from "@/components/dialogs/Settings.vue";
import MicroMenu from "@/components/overlay/MicroMenu.vue";
import AppToasts from "@/components/ui/AppToasts.vue";
import { useDialogsStore } from "@/stores/dialogsStore";
import { useSocketStore } from "@/stores/socketStore";
import { useUserStore } from "@/stores/userStore";
import { useChatStore } from "@/stores/chatStore";
import { useArenaStore } from "@/stores/arenaStore";
import { keybinds } from "@/utils/keybinds";
import keybindsConfig from "@/config/keybindsConfig";
import createKeybindActions from "@/utils/keybindActions";

const dialogs = useDialogsStore();
const socket = useSocketStore();
const user = useUserStore();
const chatStore = useChatStore();
const arenaStore = useArenaStore();

const keybindsEnabled = ref(true);
let ws = null;

function keybindDisable(event) {
  if (event.target.tagName.toUpperCase() === "INPUT") {
    keybindsEnabled.value = false;
  }
}

function keybindEnable() {
  keybindsEnabled.value = true;
}

function setupKeybinds() {
  const actions = createKeybindActions({
    dialogs,
    arenaStore,
    chatStore,
    user,
  });
  // Register actions from config and wire to central actions
  keybindsConfig.forEach((entry) => {
    const handler = () => {
      if (!keybindsEnabled.value) return;
      const fn = actions[entry.id];
      if (fn) fn();
    };

    keybinds.registerAction(entry.id, {
      handler,
      label: entry.label,
      defaultCombo: entry.defaultCombo,
    });
  });

  keybinds.start();
}

function connect() {
  ws = new WebSocket("ws://localhost:3001/");
  ws.onopen = () => {
    socket.setConnection(true);
  };
  ws.onclose = () => {
    socket.setConnection(false);
    setTimeout(connect, 1000);
  };
  ws.onmessage = (event) => {
    let data;
    if (event.data) data = JSON.parse(event.data);
    switch (data?.type) {
      case "movement":
        if (data.body?.entities) arenaStore.setEntities(data.body.entities);
        if (data.body?.active) arenaStore.setActive(data.body.active);
        break;
      case "chat":
        if (data.body) {
          const message = data.body.message || data.body;
          if (message) chatStore.ADD_MESSAGE(message);
        }
        break;
      case "arena":
        if (data.body?.terrain) arenaStore.setTerrain(data.body.terrain);
        break;
      case "combat_start":
        arenaStore.setCombat(true);
        break;
      case "combat_end":
        arenaStore.setCombat(false);
        break;
      default:
        console.log(data);
        break;
    }
  };
}

const route = useRoute();

onMounted(() => {
  connect();
  setupKeybinds();
  document.addEventListener("focusin", keybindDisable);
  document.addEventListener("focusout", keybindEnable);

  const uri = route.path;
  if (
    uri !== "/login" &&
    uri !== "/register" &&
    uri !== "/characters" &&
    uri !== "/builder"
  ) {
    user.getUser();
  }
});

onBeforeUnmount(() => {
  keybinds.stop();
  document.removeEventListener("focusin", keybindDisable);
  document.removeEventListener("focusout", keybindEnable);
});
</script>

<style>
@import url("https://fonts.googleapis.com/css2?family=Permanent+Marker&display=swap");
@import url("https://fonts.googleapis.com/css2?family=Square+Peg&display=swap");

/* Fonts */
.v-application .permanent-marker {
  font-family: "Permanent Marker", cursive !important;
}
.v-application .square-peg {
  font-family: "Square Peg", sans-serif, cursive !important;
}
.v-application .colors-of-autumn {
  font-family: "Colors Of Autumn", sans-serif !important;
}

/* Opacity workaround since vuetify doesn't support this */
.glass {
  background: rgba(0, 0, 0, 0.5) !important;
}

/* Overflow overrides to hide scrollbar */
html {
  overflow-y: auto !important;
}

/* iOS Fix height */
html,
body,
.v-application,
.v-application--wrap {
  min-height: 100%;
  margin: 0;
}

/* General global styling */
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
</style>
