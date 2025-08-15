<template>
  <v-container fluid class="overlay">
    <v-layout d-flex column align-center justify-center>
      <v-icon size="48" class="mb-2">
        {{ mdiAlertCircleOutline }}
      </v-icon>
      <h3>This page could not be found</h3>
      <!--suppress HtmlUnknownTarget -->
      <a @click="$router.go(-1)"> Go Back </a>
    </v-layout>
  </v-container>
</template>

<script setup>
import { mdiAlertCircleOutline } from "@mdi/js";
</script>
