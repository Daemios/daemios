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

import { mdiLogout } from '@mdi/js';

export default {
  data: () => ({
    mdiLogout,
  }),
};
</script>
