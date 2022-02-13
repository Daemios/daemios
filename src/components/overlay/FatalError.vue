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
  <v-layout
    align-center
    justify-center
    class="fill-height background"
  >
    <v-alert
      prominent
      type="error"
      icon="mdiCloudAlert"
    >
      <h3>Oops!</h3>
      <div>
        A server error has occurred.
      </div>
      <a @click="reload">
        Try to reload the page
      </a>
    </v-alert>
  </v-layout>
</template>

<script>
import { mdiCloudAlert } from '@mdi/js';

export default {
  data: () => ({
    mdiCloudAlert,
  }),
  methods: {
    reload() {
      document.location.reload();
    },
  },
};
</script>
