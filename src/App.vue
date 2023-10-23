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

    <!-- Main Content -->
    <v-main class="background fill-height">
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
          @click="$store.commit('dialogs/toggleEquipment')"
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
          @click="$store.commit('dialogs/toggleInventory')"
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
          @click="$store.commit('dialogs/toggleAbilities')"
        >
          <v-icon small>
            {{ mdiSword }}
          </v-icon>
        </v-btn>
      </div>
    </div>

    <!-- Websocket lock -->
    <v-dialog
      :value="!$store.state.socket.connection"
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
import { mdiTreasureChest, mdiHumanMale, mdiSword } from '@mdi/js';

import Header from '@/components/overlay/Header';
import Navigation from '@/components/overlay/Navigation';
import Equipment from '@/components/dialogs/Equipment';
import Inventory from '@/components/dialogs/Inventory';
import Abilities from '@/components/dialogs/Abilities'
import Map from '@/components/dialogs/Map';
import Background from '@/components/background/Background.vue';

import mixin_keybinds from '@/mixins/keybinds';
import mixin_socket from '@/mixins/socket';

export default {
  components: {
    Background,
    Header,
    Navigation,
    Equipment,
    Inventory,
    Abilities,
  },
  mixins: [mixin_keybinds, mixin_socket],
  data: () => ({
    mdiHumanMale,
    mdiTreasureChest,
    mdiSword,
  }),
};
</script>

<style lang="sass">

@import url('https://fonts.googleapis.com/css2?family=Permanent+Marker&display=swap')
@import url('https://fonts.googleapis.com/css2?family=Square+Peg&display=swap')

@font-face
  font-family: 'Colors Of Autumn'
  //src: url('/fonts/coa.ttf')
  // project cant grab this for some reason?

/* Fonts */
.v-application
  .permanent-marker
    font-family: 'Permanent Marker', cursive !important
  .square-peg
    font-family: 'Square Peg', sans-serif, cursive !important
  .colors-of-autumn
    font-family: 'Colors Of Autumn', sans-serif !important

/* Opacity workaround since vuetify doesn't support this */
.glass
  background: rgba(0,0,0,.5) !important

/* Overflow overrides to hide scrollbar */
html
  overflow-y: auto !important

/* iOS Fix height */
html, body, .v-application, .v-application--wrap

/* General global styling */
#app
  font-family: Avenir, Helvetica, Arial, sans-serif
  -webkit-font-smoothing: antialiased
  -moz-osx-font-smoothing: grayscale

.dialog-buttons
  position: absolute
  bottom: 0
  width: 100%

.dialog-button-center
  display: flex
  gap: 4px
  z-index: 999999

</style>
