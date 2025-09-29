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
@import url("https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Spectral:wght@300;400;600&family=Uncial+Antiqua&display=swap");

:root {
  --fantasy-bg: radial-gradient(circle at top, rgba(136, 91, 222, 0.28) 0%, rgba(7, 4, 21, 0) 55%),
    radial-gradient(circle at 20% 80%, rgba(91, 167, 222, 0.24) 0%, rgba(7, 4, 21, 0) 60%),
    linear-gradient(180deg, #05030d 0%, #0f0420 60%, #1a0b33 100%);
  --fantasy-surface: rgba(18, 10, 33, 0.8);
  --fantasy-highlight: rgba(243, 210, 106, 0.85);
  --fantasy-border: rgba(233, 198, 120, 0.55);
  --fantasy-text: #f8f5ff;
  --fantasy-text-muted: #c7bde4;
  color-scheme: dark;
}

body {
  margin: 0;
  min-height: 100vh;
  font-family: "Spectral", "Cinzel", serif;
  background: var(--fantasy-bg);
  color: var(--fantasy-text);
  overflow-y: auto !important;
}

html,
body,
.v-application,
.v-application--wrap {
  min-height: 100%;
}

#app {
  position: relative;
  font-family: "Spectral", "Cinzel", serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#app::before {
  content: "";
  position: fixed;
  inset: 0;
  pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='320' viewBox='0 0 320 320'%3E%3Cg fill='none' stroke='rgba(255,255,255,0.08)' stroke-width='1'%3E%3Cpath d='M0 40h320M0 80h320M0 120h320M0 160h320M0 200h320M0 240h320M0 280h320M40 0v320M80 0v320M120 0v320M160 0v320M200 0v320M240 0v320M280 0v320'/%3E%3Ccircle cx='20' cy='20' r='1.2'/%3E%3Ccircle cx='100' cy='260' r='1.2'/%3E%3Ccircle cx='280' cy='140' r='1.2'/%3E%3C/g%3E%3C/svg%3E");
  opacity: 0.35;
  mix-blend-mode: screen;
}

.v-application {
  background: transparent !important;
  color: var(--fantasy-text);
}

.v-main {
  background: transparent !important;
}

.v-application .fantasy-heading {
  font-family: "Cinzel", "Spectral", serif !important;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.v-application .fantasy-script {
  font-family: "Uncial Antiqua", "Cinzel", serif !important;
  letter-spacing: 0.1em;
}

.glass {
  background: var(--fantasy-surface) !important;
  border: 1px solid rgba(233, 198, 120, 0.25);
  box-shadow: 0 20px 40px rgba(3, 0, 12, 0.55);
  backdrop-filter: blur(12px);
}
</style>
