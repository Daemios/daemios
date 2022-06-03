<template>
  <v-app
    id="app"
  >
    <!-- Header -->
    <Header v-if="$route.meta['overlay']" />

    <!-- Nav Drawer -->
    <Navigation v-if="$route.meta['overlay']" />

    <!-- Game Dialogs -->
    <Equipment />
    <Inventory />

    <!-- Main Content -->
    <v-main class="background">
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
      </div>
    </div>

  </v-app>
</template>

<script>
import { mdiTreasureChest, mdiHumanMale } from '@mdi/js';

import Header from '@/components/overlay/Header';
import Navigation from '@/components/overlay/Navigation';

// Drawer Imports
import Equipment from '@/components/dialogs/Equipment';
import Inventory from '@/components/dialogs/Inventory';
import Keybinds from '@/mixins/keybinds';

export default {
  components: {
    Header,
    Navigation,
    Equipment,
    Inventory,
  },
  mixins: [Keybinds],
  data() {
    return {
      mdiHumanMale,
      mdiTreasureChest,
    };
  },
};
</script>

<style lang="sass">

@import url('https://fonts.googleapis.com/css2?family=Permanent+Marker&display=swap')
@import url('https://fonts.googleapis.com/css2?family=Square+Peg&display=swap')

.v-application
  .permanent-marker
    font-family: 'Permanent Marker', cursive !important
  .square-peg
    font-family: 'Square Peg', sans-serif, cursive !important

/* Overflow overrides to hide scrollbar */
html
  overflow-y: auto !important

/* iOS Fix height */
html, body, .v-application, .v-application--wrap
  //noinspection CssInvalidPropertyValue
  min-height: -webkit-fill-available

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
