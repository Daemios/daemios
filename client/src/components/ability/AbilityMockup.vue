<template>
  <div
    class="ability-grid"
    :style="`grid-template-columns: repeat(${width}, 10px); grid-template-rows: repeat(${height}, 10px);`"
  >
    <div v-for="(row, x) in grid" :key="x">
      <div
        v-for="(column, y) in row"
        :key="y"
        class="block"
        style="height: 10px; width: 10px"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";

const props = defineProps({
  height: {
    type: Number,
    required: true,
  },
  width: {
    type: Number,
    required: true,
  },
  key_prefix: {
    type: [String, Number],
    required: true,
  },
});

const grid = ref(null);

onMounted(() => {
  grid.value = Array(props.height)
    .fill(0)
    .map(() => Array(props.width).fill(0));
});
</script>

<style>
.ability-grid {
  display: grid;
  grid-gap: 0;
}
.ability-grid .block {
  background-color: #fff;
  border: 1px solid #ccc;
  cursor: pointer;
}
.ability-grid .block:hover {
  background-color: #ccc;
}
</style>
