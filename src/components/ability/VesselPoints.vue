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
        :disabled="current - 1 < start && positiveOnly"
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
  },
  data() {
    return {
      mdiPlus,
      mdiMinus,
      current: null,
    };
  },
  computed: {
    divisions() {
      return Math.floor(this.current / 9);
    },
  },
  mounted() {
    this.current = this.start;
  },
  methods: {
    increment() {
      this.current += 1;
      this.$emit('input', this.current);
    },
    decrement() {
      this.current -= 1;
      this.$emit('input', this.current);
    },
    classes(n) {
      return {
        black: (this.start >= n),
        'green lighten-2': (this.current >= n && n > this.start),
        'red lighten-2': (
          this.current < this.start // are we going negative
          && n > this.current // cell is higher than the current aka its point is removed
          && n <= this.start // cell is part of the existing points
        ),
      };
    },
  },
};
</script>
<style lang="sass">
.block-counter
  display: grid
  grid-template-columns: 1fr auto

  .operations
    display: flex
    flex-direction: column
    justify-content: space-between
    padding: .25rem 0 .25rem .25rem

  .blocks
    padding: .5rem
    display: grid
    grid-template-columns: 15px 15px 15px
    grid-template-rows: 15px 15px 15px
    grid-gap: 3px

    .block

      &.temporary
        background: rgba(255,255,255,.4)

      &.active
        background: rgba(255,255,255,.8)

</style>
