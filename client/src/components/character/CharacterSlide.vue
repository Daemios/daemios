<template>
  <v-layout
    class="d-flex flex-grow-0"
    style="position: relative; height: 100px; width: 296px;"
  >
    <!-- Avatar Image -->
    <v-sheet
      height="100"
      width="100"
      class="d-flex align-center justify-center"
      :color="color"
      style="border-radius: 8px"
    >
      <v-img
        v-if="avatar_url"
        :src="avatar_url"
        height="100px"
        width="100px"
        style="border-radius: 8px"
      />
      <v-icon v-else>
        {{ mdiHelp }}
      </v-icon>
    </v-sheet>
    <!-- Name  -->
    <v-card
      class="ml-n1 mb-2 pa-2 align-self-end"
      height="60"
      style="position: absolute; z-index: 1; width: 200px; left: 92px; border-radius: 4px;"
      :style="`border-left: ${leftBorder}`"
    >
      <div>
        {{ nameDisplay }}
      </div>
      <div class="caption">
        {{ title || '' }}
      </div>
    </v-card>
  </v-layout>
</template>

<script setup>
import { computed } from 'vue';
import { mdiHelp } from '@mdi/js';

const props = defineProps({
  avatar_url: {
    type: String,
    default: null,
  },
  name: {
    type: String,
    default: null,
  },
  color: {
    type: String,
    default: null,
  },
  title: {
    type: String,
    default: null,
  },
});

const nameDisplay = computed(() => (props.name ? props.name : 'Enter Name'));
const leftBorder = computed(() => (props.color ? `4px solid ${props.color}` : 'none'));
</script>
