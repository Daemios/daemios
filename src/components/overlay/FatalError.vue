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
