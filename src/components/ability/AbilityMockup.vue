<template>
  <div
    class="ability-grid"
    :style="`grid-template-columns: repeat(${width}, 10px); grid-template-rows: repeat(${height}, 10px);`"
  >
    <div
      v-for="(row, x) in grid"
      :key="x"
    >
      <div
        v-for="(column, y) in row"
        :key="y"
        class="block"
        style="height: 10px; width: 10px;"
      />
    </div>
  </div>
</template>

<script>
export default {
  props: {
    height: {
      type: Number,
      required: true,
    },
    width: {
      type: Number,
      required: true,
    },
    key_prefix: {
      type: Number,
      required: true,
    },
  },
  data: () => ({
     grid: null,
  }),
  mounted() {
    this.grid = Array(this.height).fill(0).map(() => Array(this.width).fill(0));
  },
}
</script>

<style lang="sass">
.ability-grid
  display: grid
  grid-gap: 0

  .block
    background-color: #fff
    border: 1px solid #ccc
    cursor: pointer
    &:hover
      background-color: #ccc
</style>
