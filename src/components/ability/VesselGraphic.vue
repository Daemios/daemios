<template>
  <v-row
    class="cores-graphic d-flex justify-center align-center flex-grow-0"
  >
    <v-col
      class="d-block"
    >
      <div class="core">
        <v-img
          v-if="element.imgs.core"
          class="core-img"
          :lazy-src="element.imgs.core"
          :src="element.imgs.core"
        />
        <div class="core-effects" />
      </div>
      <div class="shadow" />
    </v-col>
  </v-row>
</template>

<script>
export default {
  props: {
    element: {
      type: Object,
      required: true,
    },
  },
  data: () => ({
  }),
};
</script>

<style lang="scss">
.cores-graphic {
  .core {
    height: 150px;
    width: 150px;
    //border-radius: 50%
    overflow: hidden;
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative;
  }

  .core-effects {
    position: absolute;
    height: 103%;
    width: 100%;
    background: radial-gradient(
        circle at 75px 65px,
        rgba(0,0,0,0),
        rgba(0,0,0,0),
        rgba(0,0,0,0),
        rgba(0,0,0,0),
        rgba(0,0,0,0),
        rgba(0,0,0,1),
        rgba(0,0,0,1),
        rgba(0,0,0,1),
        rgba(0,0,0,1),
        rgba(0,0,0,1)
    );

  }
}

</style>
