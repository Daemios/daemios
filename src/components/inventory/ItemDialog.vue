<template>
  <!-- Gear Slot Dialog -->
  <v-dialog
    v-if="show"
    v-model="show"
    max-width="800px"
    content-class="item-dialog"
  >
    <v-card class="item-slot-dialog">
      <!-- TODO make this img only be a small part and animate it to float -->
      <!-- TODO background color based on rarity with a circular darken effect on edges -->
      <v-img
        :src="show.img"
        aspect-ratio="1.7778"
      />
      <div class="item-info white--text pa-2">

        <!-- Stats -->
        <div
          v-if="show.stats"
          class="stats d-flex"
        >
          <div
            v-for="(stat, n) in show.stats"
            :key="n"
            class="stat mb-3"
          >
            <div class="subtitle-2 text-right">
              {{ stat.label }}
            </div>
            <div class="text-h2 text-right">
              {{ stat.value }}
            </div>
          </div>
        </div>

        <!-- Effect -->
        <div
          v-if="show.effect"
          class="effect"
        >
          <div class="subtitle-2 text-right">
            Effect
          </div>
          <div class="text-right">
            {{ show.effect }}
          </div>
        </div>

        <!-- Description -->
        <div
          v-if="show.description"
          class="description mt-auto"
        >
          <div class="subtitle-2 text-right">
            Description
          </div>
          <div class="text-right">
            {{ show.description }}
          </div>
        </div>
      </div>
      <div class="name white--text pa-2">
        <h2>{{ show.label }} <span v-if="show.quantity">x{{ show.quantity }}</span></h2>
        <h5>{{ show.slot }}</h5>
      </div>
      <div
        class="rarity pa-2"
      >
        <v-chip
          :class="dialogBackground"
          class="caption font-weight-bold d-flex justify-center"
        >
          {{ show.rarity }}
        </v-chip>
      </div>
    </v-card>
  </v-dialog>
</template>

<script>
export default {
  props: {
    item: {
      type: Object,
      default: null,
    },
  },
  computed: {
    show: {
      get() {
        return this.item;
      },
      // setter
      set() {
        this.$emit('close');
      },
    },
    dialogBackground() {
      return {
        'grey lighten-1 black--text': this.show.rarity.toLowerCase() === 'common',
        'green darken-3 white--text': this.show.rarity.toLowerCase() === 'uncommon',
        'blue accent-3 white--text': this.show.rarity.toLowerCase() === 'rare',
        'deep-purple accent-4 white--text': this.show.rarity.toLowerCase() === 'epic',
        'orange darken-2 white--text': this.show.rarity.toLowerCase() === 'legendary',
      };
    },
  },
};
</script>

<style lang="sass">
.item-dialog
  position: relative

  .v-response__content
    background: white

  .item-info, .name, .rarity
    position: absolute

  .item-info
    right: 0
    top: 0
    bottom: 0
    background: rgba(0,0,0,.4)
    width: 250px
    display: flex
    flex-direction: column
    overflow-y: scroll
    scrollbar-width: none

    &::-webkit-scrollbar
      display: none

    .stats
      gap: .5rem

  .name
    top: 6px
    left: 12px
    width: calc(100% - 12px)

  .rarity
    bottom: 6px
    left: 12px
    width: calc(100% - 12px)

    .v-chip
      width: 90px

</style>
