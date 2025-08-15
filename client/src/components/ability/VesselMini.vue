<template>
  <div class="vessel-mini" :style="{ background: color }" />
</template>

<script setup>
defineProps({
  color: {
    type: String,
    required: true,
  },
});
</script>

<style>
.vessel-mini {
  clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%);
  height: 20px;
  width: 20px;
}
</style>
