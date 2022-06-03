<template>
  <v-layout
    column
    align-center
    justify-center
  >
    <v-card>
      <v-card-title>
        <h1
          v-if="!name_toggle"
          @click="toggleInput()"
        >
          Test Name
        </h1>
        <v-input v-else />
      </v-card-title>
    </v-card>
  </v-layout>
</template>

<script>
export default {
  data: () => ({
    name_toggle: false,
  }),
  methods: {
    toggleInput() {

    },
  },
};
</script>
