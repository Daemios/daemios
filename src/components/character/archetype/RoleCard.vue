<template>
  <v-card
    style="width: 400px; height: 600px; flex-shrink: 0"
    class="mx-2 d-flex flex-column"
    :style="`background-image: url(${role.background}); background-size: cover; background-position: center;`"
  >
    <v-card-title class="flex-column glass">
      <div>
        {{ role.label }}
      </div>
      <div class="subtitle-2 font-weight-regular">
        {{ role.description }}
      </div>
    </v-card-title>
    <v-card-text>
      50% Increased Healing
    </v-card-text>
    <v-spacer />
    <v-card-actions class="mt-auto">
      <v-btn
        color="primary"
        class="ml-auto"
        @click="selectRole(role)"
      >
        Select
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script>
// build basic vue script tag
export default {
  props: {
    role: {
      type: Object,
      required: true,
    },
  },
};
</script>