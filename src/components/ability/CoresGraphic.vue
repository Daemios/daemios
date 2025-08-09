<template>
  <v-row
    class="cores-graphic d-flex justify-center align-center flex-grow-0"
  >
    <v-col
      v-for="index in count"
      :key="index"
      class="d-block"
    >
      <div
        class="fragment"
        :style="coreStyle(index)"
      >
        <div class="core-rounding" />
      </div>
      <div class="shadow" />
    </v-col>
  </v-row>
</template>

<script>
export default {
  props: {
    count: {
      type: Number,
      default: 1,
    },
  },
  data: () => ({
    colors: ['#1E88E5', '#B2FF59', '#E65100', '#004D40', '#827717'],
  }),
  methods: {
    coreStyle(index) {
      return `background: radial-gradient(circle at ${10 * (this.count - (Math.floor(index / 1.5)) + 1) + 20}px 30px, ${this.colors[index - 1]}, #000)`;
    },
  },
};
</script>

<style>
.cores-graphic .fragment { background: white; height: 100px; width: 100px; clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%); border-radius: 50%; overflow: hidden; }
.cores-graphic .fragment .core-rounding { height: 100%; width: 100%; }
</style>
