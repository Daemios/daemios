<template>
  <v-app-bar app fixed dense>
    <v-app-bar-nav-icon @click="toggleNav" />
    <v-spacer />
    <v-app-bar-nav-icon @click="router.push('/login')">
      <v-icon>{{ mdiLogout }}</v-icon>
    </v-app-bar-nav-icon>
  </v-app-bar>
</template>

<script setup>
import { mdiLogout } from "@mdi/js";
import { useUiStore } from "@/stores/uiStore";
import { useRouter } from "vue-router";

const router = useRouter();

function toggleNav() {
  const ui = useUiStore();
  ui.navigation = !ui.navigation;
}
</script>
