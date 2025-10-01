<template>
  <div class="stub-cutscene">
    <h2>Welcome To The World</h2>
    <p>A short welcome animation placeholder.</p>
    <div class="actions">
      <button
        @click="done"
      >
        Continue
      </button>
    </div>
  </div>
</template>

<script setup>
import { defineProps } from 'vue';
const props = defineProps({
  frame: { type: Object, default: () => ({}) },
  advance: { type: Function, default: null },
});
function done() {
  if (typeof props.advance === 'function') props.advance();
  else {
    const e = new CustomEvent('done');
    window.dispatchEvent(e);
  }
}
</script>

<style scoped>
.stub-cutscene { padding: 12px; color: white }
.actions { margin-top: 12px }
</style>
