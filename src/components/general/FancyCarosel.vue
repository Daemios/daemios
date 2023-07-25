<template>
  <div class="carousel d-flex">
    <v-layout align-center>
      <v-btn
        fab
        small
        class=""
        @click="prev"
      >
        <v-icon>
          {{ mdiChevronLeft }}
        </v-icon>
      </v-btn>
    </v-layout>
    <div
      class="center overflow-hidden"
      style="width: 420px"
    >
      <v-layout
        class="content"
        :style="`margin-left: -${(index) * 416}px`"
      >
        <slot />
      </v-layout>
      <div
        class="d-flex justify-center align-center pa-2"
      >
        <!-- icons to show location in list -->
        <v-icon
          v-for="n in $slots.default.length"
          :key="n"
          :color="n === index + 1 ? 'white' : 'grey'"
          x-small
          class="mx-1"
          @click="index = n-1"
        >
          {{ mdiCircle }}
        </v-icon>
      </div>
      <v-layout justify-center>
        {{ index }}
      </v-layout>
    </div>
    <v-layout align-center>
      <v-btn
        fab
        small
        class=""
        @click="next"
      >
        <v-icon>
          {{ mdiChevronRight }}
        </v-icon>
      </v-btn>
    </v-layout>
  </div>
</template>

<script>
import { mdiCircle, mdiChevronRight, mdiChevronLeft } from '@mdi/js';

export default {
  data() {
    return {
      mdiCircle,
      mdiChevronRight,
      mdiChevronLeft,
      index: 0,
    };
  },
  methods: {
    next() {
      if (this.index < this.$slots.default.length - 1) {
        this.index += 1;
      }
    },
    prev() {
      if (this.index > 0) {
        this.index -= 1;
      }
    },
  },
};
</script>