<template>
  <div
    class="vessel-mini"
    :style="`background: ${color};`"
  />
</template>

<script>
export default {
  props: {
    color: {
      type: String,
      required: true,
    },
    large: {
      type: Boolean,
      default: false,
    },
    small: {
      type: Boolean,
      default: true,
    },
  },
};
</script>

<style lang="sass">

.vessel-mini
  clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)
  height: 20px
  width: 20px
</style>
