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
  <v-container
    fluid
    class="overlay"
  >
    <v-layout
      d-flex
      column
      align-center
      justify-center
    >
      <v-icon
        size="48"
        class="mb-2"
      >
        {{ mdiAlertCircleOutline }}
      </v-icon>
      <h3>This page could not be found</h3>
      <!--suppress HtmlUnknownTarget -->
      <a @click="$router.go(-1)">
        Go Back
      </a>
    </v-layout>
  </v-container>
</template>

<script>
import { mdiAlertCircleOutline } from '@mdi/js';

export default {
  data: () => ({
    mdiAlertCircleOutline,
  }),
};
</script>
