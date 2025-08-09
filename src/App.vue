<template>
  <v-app
    id="app"
  >
    <!-- Background -->
    <Background />

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
      class="dialog-buttons d-flex justify-center"
    >
      <div class="dialog-button-center grey pa-1 rounded mb-1">
        <v-btn
          depressed
          x-small
          height="30"
          width="30"
          @click="dialogs.toggleEquipment()"
        >
          <v-icon small>
            {{ mdiHumanMale }}
          </v-icon>
        </v-btn>
        <v-btn
          depressed
          x-small
          height="30"
          width="30"
          @click="dialogs.toggleInventory()"
        >
          <v-icon small>
            {{ mdiTreasureChest }}
          </v-icon>
        </v-btn>
        <v-btn
          depressed
          x-small
          height="30"
          width="30"
          @click="dialogs.toggleAbilities()"
        >
          <v-icon small>
            {{ mdiSword }}
          </v-icon>
        </v-btn>
        <v-btn
          depressed
          x-small
          height="30"
          width="30"
          @click="dialogs.toggleOptions()"
        >
          <v-icon small>
            {{ mdiCog }}
          </v-icon>
        </v-btn>
      </div>
    </div>

    <!-- Websocket lock -->
    <v-dialog
  :value="!socket.connection"
      persistent
      max-width="400"
    >
      <v-card class="pa-4">
        <v-card-text class="pa-0 d-flex align-center justify-center">
          <v-progress-circular
            size="20"
            indeterminate
            class="mr-4"
          />
          Attempting to reconnect to Websocket server...
        </v-card-text>
      </v-card>
    </v-dialog>

  </v-app>
</template>

<script>
import { defineAsyncComponent } from 'vue';
import { mdiTreasureChest, mdiHumanMale, mdiSword, mdiCog } from '@mdi/js';
import { useDialogsStore } from '@/stores/dialogsStore';
import { useSocketStore } from '@/stores/socketStore';
import { useUserStore } from '@/stores/userStore';

import mixin_keybinds from '@/mixins/keybinds';
import mixin_socket from '@/mixins/socket';

export default {
  components: {
  Background: defineAsyncComponent(() => import('@/components/background/Background.vue')),
  Equipment: defineAsyncComponent(() => import('@/components/dialogs/Equipment.vue')),
  Inventory: defineAsyncComponent(() => import('@/components/dialogs/Inventory.vue')),
  Abilities: defineAsyncComponent(() => import('@/components/dialogs/Abilities.vue')),
  Options: defineAsyncComponent(() => import('@/components/dialogs/Options.vue')),
  },
  mixins: [
    mixin_keybinds,
    mixin_socket
  ],
  data: () => ({
    mdiHumanMale,
    mdiTreasureChest,
    mdiSword,
    mdiCog,
    dialogs: null,
    socket: null,
    user: null,
  }),
  created() {
    this.dialogs = useDialogsStore();
    this.socket = useSocketStore();
    this.user = useUserStore();
  },
  mounted() {
    const uri = this.$route.path;
    if (
      uri !== '/login' &&
      uri !== '/register' &&
      uri !== '/characters' &&
      uri !== '/builder'
    ) {
      this.user.getUser();
    }
  },
};
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Permanent+Marker&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Square+Peg&display=swap');

/* Fonts */
.v-application .permanent-marker { font-family: 'Permanent Marker', cursive !important; }
.v-application .square-peg { font-family: 'Square Peg', sans-serif, cursive !important; }
.v-application .colors-of-autumn { font-family: 'Colors Of Autumn', sans-serif !important; }

/* Opacity workaround since vuetify doesn't support this */
.glass { background: rgba(0,0,0,.5) !important; }

/* Overflow overrides to hide scrollbar */
html { overflow-y: auto !important; }

/* iOS Fix height */
html, body, .v-application, .v-application--wrap { min-height: 100%; margin: 0; }

/* General global styling */
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.dialog-buttons { position: absolute; bottom: 0; width: 100%; }

.dialog-button-center { display: flex; gap: 4px; z-index: 999999; }
</style>
