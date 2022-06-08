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
.animated-background
  position: absolute
  height: 100vh
  width: 100vw
  overflow: hidden
  display: flex
  justify-content: center

  &.zoom
    animation-duration: 3s
    animation-name: login-zoom
    animation: 2s forwards login-zoom

  video
    width: auto
    height: 100%
    left: 0
    right: 0
</style>
