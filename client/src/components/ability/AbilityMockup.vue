<template>
  <div
    class="ability-grid"
    :style="`grid-template-columns: repeat(${width}, ${blockSize}px); grid-template-rows: repeat(${height}, ${blockSize}px);`"
  >
    <div v-for="(row, x) in grid" :key="x">
      <div
        v-for="(column, y) in row"
        :key="y"
        class="block"
        :style="{
          height: blockSize + 'px',
          width: blockSize + 'px',
          backgroundColor: cellColor(x, y),
        }"
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
  blockSize: {
    type: Number,
    required: false,
    default: 6,
  },
  // Optional pattern: 2D array of truthy values to indicate filled cells.
  pattern: {
    type: Array,
    required: false,
    default: null,
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

function cellColor(x, y) {
  // If a pattern is provided, center it inside the grid and show white for filled cells
  if (!props.pattern) return "#fff";

  // pattern may be smaller than grid; center pattern
  const pH = props.pattern.length;
  const pW = (props.pattern[0] || []).length;
  const offsetX = Math.floor((props.height - pH) / 2);
  const offsetY = Math.floor((props.width - pW) / 2);

  const px = x - offsetX;
  const py = y - offsetY;
  if (px >= 0 && px < pH && py >= 0 && py < pW) {
    return props.pattern[px][py] ? "#fff" : "transparent";
  }
  return "transparent";
}
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
