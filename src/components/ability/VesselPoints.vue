<template>
  <div class="block-counter">
    <div class="blocks container">
      <div
        v-for="n in 9"
        :key="n"
        :class="classes(n)"
      />
    </div>
    <div class="operations">
      <v-btn
        dark
        dense
        x-small
        width="20"
        class="pa-0"
        :disabled="limit === 0"
        @click="increment()"
      >
        <v-icon
          dense
          x-small
        >
          {{ mdiPlus }}
        </v-icon>
      </v-btn>

      <v-btn
        dark
        x-small
        :disabled="modelValue - 1 < start && positiveOnly"
        @click="decrement()"
      >
        <v-icon
          dense
          x-small
        >
          {{ mdiMinus }}
        </v-icon>
      </v-btn>

    </div>
  </div>
</template>
<script>
import { mdiPlus, mdiMinus } from '@mdi/js';

export default {
  props: {
    title: {
      type: String,
      required: true,
    },
    limit: {
      type: Number,
      required: true,
    },
    start: {
      type: Number,
      required: true,
    },
    positiveOnly: {
      type: Boolean,
      default: false,
    },
    modelValue: {
      type: Number,
      required: true,
    },
  },
  emits: ['update:modelValue'],
  data: () => ({
    mdiPlus,
    mdiMinus,
  }),
  computed: {
    divisions() {
      return Math.floor(this.modelValue / 9);
    },
  },
  methods: {
    increment() {
      this.$emit('update:modelValue', this.modelValue + 1);
    },
    decrement() {
      this.$emit('update:modelValue', this.modelValue - 1);
    },
    classes(n) {
      return {
        black: (this.start >= n),
        'green lighten-2': (this.modelValue >= n && n > this.start),
        'red lighten-2': (
          this.modelValue < this.start // are we going negative
          && n > this.modelValue // cell is higher than the current aka its point is removed
          && n <= this.start // cell is part of the existing points
        ),
      };
    },
  },
};
</script>
<style>
.block-counter { display: grid; grid-template-columns: 1fr auto; }
.block-counter .operations { display: flex; flex-direction: column; justify-content: space-between; padding: .25rem 0 .25rem .25rem; }
.block-counter .blocks { padding: .5rem; display: grid; grid-template-columns: 15px 15px 15px; grid-template-rows: 15px 15px 15px; grid-gap: 3px; }
.block-counter .blocks .block.temporary { background: rgba(255,255,255,.4); }
.block-counter .blocks .block.active { background: rgba(255,255,255,.8); }
</style>
