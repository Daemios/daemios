<template>
  <div class="carousel d-flex">
    <v-layout align-center>
      <v-btn
        fab
        small
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
        :style="`margin-left: -${index * 416}px`"
      >
        <slot />
      </v-layout>
      <div class="d-flex justify-center align-center pa-2">
        <v-icon
          v-for="n in slotCount"
          :key="n"
          :color="n === index + 1 ? 'white' : 'grey'"
          x-small
          class="mx-1"
          @click="index = n - 1"
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
        @click="next"
      >
        <v-icon>
          {{ mdiChevronRight }}
        </v-icon>
      </v-btn>
    </v-layout>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import { mdiCircle, mdiChevronRight, mdiChevronLeft } from "@mdi/js";

const index = ref(0);
const slots = defineSlots();

const slotCount = computed(() => (slots.default ? slots.default().length : 0));

function next() {
  if (index.value < slotCount.value - 1) {
    index.value += 1;
  }
}

function prev() {
  if (index.value > 0) {
    index.value -= 1;
  }
}
</script>
