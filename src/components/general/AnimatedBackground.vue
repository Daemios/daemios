<template>
  <div
    class="animated-background glass"
    :class="backgroundClasses"
  >
    <video
      :src="src"
      autoplay
      muted
      loop
    />
  </div>
</template>

<script>

export default {
  props: {
    src: {
      type: String,
      required: true,
    },
    zoom: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
    backgroundClasses() {
      return {
        zoom: this.zoom,
      };
    },
  },
};
</script>

<style lang="sass">
@keyframes entry-zoom
  0%
    margin: 0
    height: 100vh
    width: 100vw
    opacity: 1
  50%
    margin: -10%
    height: 120vh
    width: 120vw
    opacity: 1
  100%
    margin: -10%
    height: 120vh
    width: 120vw
    opacity: 0

.animated-background
  position: absolute
  height: 100vh
  width: 100vw
  overflow: hidden
  display: flex
  justify-content: center

  &.zoom
    animation: 2s forwards entry-zoom

  video
    width: auto
    height: 100%
    left: 0
    right: 0
</style>
