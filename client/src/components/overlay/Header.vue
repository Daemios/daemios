<template>
  <v-app-bar
    app
    fixed
    dense
  >
    <v-app-bar-nav-icon
      @click="toggleNav"
    />
    <v-spacer />
    <v-app-bar-nav-icon @click="$router.push('/login')">
      <v-icon>{{ mdiLogout }}</v-icon>
    </v-app-bar-nav-icon>
  </v-app-bar>
</template>

<script>

import { mdiLogout } from '@mdi/js';
import { useUiStore } from '@/stores/uiStore';

export default {
  data: () => ({
    mdiLogout,
  }),
  methods: {
    toggleNav() {
      const ui = useUiStore();
      ui.navigation = !ui.navigation;
    }
  }
};
</script>
