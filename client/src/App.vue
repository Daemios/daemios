<template>
  <v-app id="app">
    <!-- Game Dialogs -->
    <Equipment />
    <Inventory />
    <Abilities />
    <Options />

    <!-- Main Content -->
    <v-main class="fill-height">
      <router-view class="fill-height" />
    </v-main>

    <!-- Micro menu -->
    <div
      v-if="$route.meta['overlay']"
      class="d-flex justify-center position-absolute bottom-0 w-100"
    >
      <div class="grey pa-1 rounded mb-1 d-flex gap-1" style="z-index: 999999">
        <v-btn
          variant="flat"
          size="x-small"
          height="30"
          width="30"
          @click="dialogs.toggleEquipment()"
        >
          <v-icon size="small">
            {{ mdiHumanMale }}
          </v-icon>
        </v-btn>
        <v-btn
          variant="flat"
          size="x-small"
          height="30"
          width="30"
          @click="dialogs.toggleInventory()"
        >
          <v-icon size="small">
            {{ mdiTreasureChest }}
          </v-icon>
        </v-btn>
        <v-btn
          variant="flat"
          size="x-small"
          height="30"
          width="30"
          @click="dialogs.toggleAbilities()"
        >
          <v-icon size="small">
            {{ mdiSword }}
          </v-icon>
        </v-btn>
        <v-btn
          variant="flat"
          size="x-small"
          height="30"
          width="30"
          @click="dialogs.toggleOptions()"
        >
          <v-icon size="small">
            {{ mdiCog }}
          </v-icon>
        </v-btn>
      </div>
    </div>

    <!-- Websocket lock -->
    <v-dialog :model-value="!socket.connection" persistent max-width="400">
      <v-card class="pa-4">
        <v-card-text class="pa-0 d-flex align-center justify-center">
          <v-progress-circular size="20" indeterminate class="mr-4" />
          Attempting to reconnect to Websocket server...
        </v-card-text>
      </v-card>
    </v-dialog>
  </v-app>
</template>

<script setup>
import { defineAsyncComponent, onMounted, onBeforeUnmount, ref } from "vue";
import { useRoute } from "vue-router";
import { mdiTreasureChest, mdiHumanMale, mdiSword, mdiCog } from "@mdi/js";
import { useDialogsStore } from "@/stores/dialogsStore";
import { useSocketStore } from "@/stores/socketStore";
import { useUserStore } from "@/stores/userStore";
import { useChatStore } from "@/stores/chatStore";
import { useArenaStore } from "@/stores/arenaStore";
const Equipment = defineAsyncComponent(() =>
  import("@/components/dialogs/Equipment.vue")
);
const Inventory = defineAsyncComponent(() =>
  import("@/components/dialogs/Inventory.vue")
);
const Abilities = defineAsyncComponent(() =>
  import("@/components/dialogs/Abilities.vue")
);
const Options = defineAsyncComponent(() =>
  import("@/components/dialogs/Options.vue")
);

const dialogs = useDialogsStore();
const socket = useSocketStore();
const user = useUserStore();
const chatStore = useChatStore();
const arenaStore = useArenaStore();

const keybindsEnabled = ref(true);
let ws = null;

function handleKeypress(event) {
  if (!keybindsEnabled.value) return;
  switch (event.code) {
    case "Escape":
      if (
        dialogs.isEquipmentOpen ||
        dialogs.isInventoryOpen ||
        dialogs.isAbilitiesOpen ||
        dialogs.isOptionsOpen
      ) {
        dialogs.closeEquipment();
        dialogs.closeInventory();
        dialogs.closeAbilities();
        dialogs.closeOptions();
      } else {
        dialogs.toggleOptions();
      }
      break;
    case "KeyC":
      dialogs.toggleEquipment();
      break;
    case "KeyA":
      dialogs.toggleAbilities();
      break;
    case "KeyI":
      dialogs.toggleInventory();
      break;
    default:
      break;
  }
}

function keybindDisable(event) {
  if (event.target.tagName.toUpperCase() === "INPUT") {
    keybindsEnabled.value = false;
  }
}

function keybindEnable() {
  keybindsEnabled.value = true;
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
  document.addEventListener("keyup", handleKeypress);
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
  document.removeEventListener("keyup", handleKeypress);
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
