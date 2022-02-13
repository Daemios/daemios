<!--
This file is part of Special Order Manager.

NOTICE: All information contained herein is, and remains the property of
Walnut Creek Hardware Inc and its suppliers, if any. The intellectual and
technical concepts contained herein are proprietary to Walnut Creek Hardware
Inc and its suppliers and are protected by trade secret or copyright law.
Dissemination of this information or reproduction of this material is
strictly forbidden unless prior written permission is obtained.

@author Grant Martin <commgdog@gmail.com>
@copyright 2021 Walnut Creek Hardware Inc.
-->

<template>
  <v-app
    id="app"
  >
    <!-- Header -->
    <Header />

    <!-- Nav Drawer -->
    <Navigation />

    <!-- Game Dialogs -->
    <Equipment />
    <Inventory />

    <v-main class="background">
      <router-view class="fill-height pa-4 pt-8" />

    </v-main>

    <div class="dialogButtons d-flex justify-center">
      <div class="dialogButtonCenter grey pa-1 rounded mb-1">
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

.dialogButtonCenter
  display: flex
  gap: 4px
  z-index: 999999

</style>
