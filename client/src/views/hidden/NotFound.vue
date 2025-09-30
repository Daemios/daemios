<template>
  <v-container
    fluid
    class="overlay fill-height"
  >
    <v-row class="d-flex flex-column align-center justify-center">
      <v-col
        cols="12"
        class="text-center"
      >
        <h1 class="mb-4 cinzel--heading">
          This page could not be found
        </h1>
        <v-btn
          size="large"
          variant="outlined"
          @click.prevent="$router.go(-1)"
        >
          Go Back
        </v-btn>
      </v-col>
    </v-row>
  </v-container>
</template>
