<template>
  <v-container class="align-start">
    <h1>Please select a core</h1>

    <!-- Core Interactions -->
    <v-row
      v-if="!selected"
      class="align-center justify-center flex-grow-0"
    >
      <v-col
        v-for="core in $store.state.user.character.cores"
        :key="core.id"
        class="d-flex flex-column align-center flex-grow-0 core"
      >
        <Core
          :core="core"
          @click="$router.push(`/cores/edit/${core.id}`)"
        />
      </v-col>
    </v-row>

  </v-container>
</template>

<script>
import Core from '@/components/ability/Vessel';

export default {
  components: {
    Core,
  },
  data: () => ({
      editing: null,
      selected: null,
  }),
};
</script>
