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
