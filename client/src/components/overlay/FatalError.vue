<template>
  <v-layout align-center justify-center class="fill-height background">
    <v-alert prominent type="error">
      <h3>Oops!</h3>
      <div>A server error has occurred.</div>
      <a @click="reload"> Try to reload the page </a>
      <template #icon>
        <v-icon>mdi-cloud-alert</v-icon>
      </template>
    </v-alert>
  </v-layout>
</template>

<script setup>
function reload() {
  document.location.reload();
}
</script>
