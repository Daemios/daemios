<template>
  <div
    class="animated-background glass position-absolute h-screen w-screen overflow-hidden d-flex justify-center"
    :class="{ zoom }"
  >
    <video
      :src="src"
      autoplay
      muted
      loop
      class="w-auto h-100"
    />
  </div>
</template>

<script setup>
const { src, zoom } = defineProps({
  src: {
    type: String,
    required: true,
  },
  zoom: {
    type: Boolean,
    default: false,
  },
});
</script>

<style scoped>
@keyframes entry-zoom {
  0%   { margin: 0; height: 100vh; width: 100vw; opacity: 1; }
  50%  { margin: -10%; height: 120vh; width: 120vw; opacity: 1; }
  100% { margin: -10%; height: 120vh; width: 120vw; opacity: 0; }
}

.animated-background.zoom { animation: 2s forwards entry-zoom; }
</style>
