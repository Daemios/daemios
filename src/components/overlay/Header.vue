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
  <v-app-bar
    app
    fixed
    dense
  >
    <v-app-bar-nav-icon
      @click="$store.state.navigation = !$store.state.navigation"
    />
    <v-spacer />
    <v-app-bar-nav-icon @click="$router.push('/login')">
      <v-icon>{{ mdiLogout }}</v-icon>
    </v-app-bar-nav-icon>
  </v-app-bar>
</template>

<script>

import { mdiCart, mdiLogout } from '@mdi/js';

export default {
  data: () => ({
    mdiCart,
    mdiLogout,
  }),
};
</script>

<style lang="sass">

</style>
