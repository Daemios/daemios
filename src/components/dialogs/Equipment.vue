<template>
  <v-dialog
    v-model="$store.state.dialogs.isEquipmentOpen"
    width="unset"
  >
    <v-card
      class="pa-2 background text--header-text"
    >
      <v-card-title class="mb-2">
        <h1>Equipment (C)</h1>
        <v-icon
          class="ml-auto"
          @click="$store.commit('dialogs/toggleEquipment')"
        >
          {{ mdiClose }}
        </v-icon>
      </v-card-title>
      <PaperDoll />
    </v-card>
  </v-dialog>
</template>

<script>
import { mdiClose } from '@mdi/js';
import PaperDoll from '@/components/character/PaperDoll';

export default {
  components: {
    PaperDoll,
  },
  data: () => ({
      mdiClose,
  }),
};
</script>
