<template>
  <v-container fluid class="pa-0 ma-0 fill-height">
    <Arena class="w-100 h-100" />
  </v-container>
</template>

<script>
import Arena from '@/components/arena/Arena.vue';

export default {
  name: 'ArenaView',
  components: {
    Arena,
  },
};
</script>
