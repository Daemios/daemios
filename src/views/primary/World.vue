<template>
  <div class="world d-flex justify-center">
    <Arena />
  </div>
</template>

<script>
import Arena from '@/components/arena/Arena';

export default {
  components: {
    Arena,
  },
};
</script>

<style lang="sass">
.world
  width: 100%
  max-width: 100%
</style>
