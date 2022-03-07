<template>
  <v-snackbar v-model="$store.state.overlay.error_snackbar_show">
    {{ $store.state.overlay.error_snackbar_text }}
    <template v-slot:action="{ attrs }">
      <v-btn
        color="red"
        text
        v-bind="attrs"
        @click="$store.commit('overlay/setErrorSnackbarShow', false)"
      >
        Close
      </v-btn>
    </template>
  </v-snackbar>
</template>
