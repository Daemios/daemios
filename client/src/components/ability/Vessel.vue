<template>
  <div class="core d-flex flex-column align-center">
    <v-btn
      fab
      class="mb-2"
      @click="$router.push(`/cores/edit/${core.id}`)"
    >
      <v-icon>
        {{ mdiDiamondStone }}
      </v-icon>
    </v-btn>
    <span class="caption">
      {{ core.label }}
    </span>
  </div>
</template>
<script>
import { mdiDiamondStone } from '@mdi/js';

export default {
  props: {
    core: {
      type: Object,
      required: true,
    },
  },
  data: () => ({
      mdiDiamondStone,
  }),
};
</script>

<style>
.core { white-space: nowrap; }
</style>
