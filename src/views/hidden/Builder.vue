<template>
  <v-layout class="builder-background ">
    <!-- Intro -->
    <v-layout
      class="intro pa-0 pa-md-2"
      column
      align-center
      justify-center
      @click="stepForward()"
    >
      <!-- Graphics -->
      <v-row class="flex-grow-0">
        <v-col
          v-for="index in step.count"
          :key="index"
        >
          <CoresGraphic
            :element="$store.state.debug.db.elements[index-1]"
          />
        </v-col>
      </v-row>
      <CoresFragmentGraphic
        v-if="step.graphic === 'fragment'"
        class="fragment"
        :count="step.count"
      />

      <!-- Text -->
      <div
        class="square-peg text-h3 text white--text mt-12 text-center"
        style="height: 1px"
      >
        {{ step.text }}
      </div>

      <!-- Interfaces -->
      <div v-if="count === 13">
        core 1
        fragment 1
        core 2
        fragment 2
      </div>
    </v-layout>

    <!-- Core Selection -->
  </v-layout>
</template>

<script>
import CoresGraphic from '@/components/cores/Graphic';
import CoresFragmentGraphic from '@/components/cores/FragmentGraphic';

export default {
  components: {
    CoresGraphic,
    CoresFragmentGraphic,
  },
  data: () => ({
    count: 1,
    step: {
      text: null,
      graphic: false,
    },
    steps: {
      0: {
        text: '',
        graphic: false,
      },
      1: {
        text: 'Adventurers all use the elements bound to items called Elemental Cores to create abilities',
        graphic: 'cores',
        count: 5,
      },
      2: {
        text: 'The above cores represent Fire, Nature, Ice, Lightning, and Water. There are ',
        graphic: 'cores',
        count: 5,
      },
      3: {
        text: 'If you hope to tame the elements, understand this...',
        graphic: 'cores',
        count: 5,
      },
      4: {
        text: 'Each Core is the beating heart of a single ability',
        graphic: 'cores',
        count: 5,
      },
      5: {
        text: 'In order to shape the elemental power of Cores into a specific form, you need Fragments',
        graphic: 'fragment',
        count: 5,
      },
      6: {
        text: 'Fragments of power can be found anywhere and will determine the specific effects of the ability it creates',
        graphic: 'fragment',
        count: 5,
      },
      7: {
        text: 'Using these fragments, you can express the elements in nearly infinite ways depending on the specific fragment',
        graphic: 'fragment',
        count: 5,
      },
      8: {
        text: 'For example, the shamans of the desert use shards of the Savrian Singing Crystals '
          + 'to tame the element of Water to draw forth moisture in even the driest conditions',
        graphic: 'fragment',
        count: 1,
      },
      9: {
        text: 'Of course, there are many ways Fragments that can be command the elements during combat as well',
        graphic: 'fragment',
        count: 5,
      },
      10: {
        text: 'One last thing to remember is that Cores will come in varying degrees of quality',
        graphic: 'cores',
        count: 5,
      },
      11: {
        text: 'Some may only be suited for small, non-combat effects, while others may be able to even expand beyond the power of Fragments',
        graphic: 'fragment',
        count: 3,
      },
      12: {
        text: 'You must choose your starting element before you continue onward to your destination',
        graphic: 'cores',
        count: 5,
      },
      13: {
        text: 'I have a small assortment that I will give to you as well so you can shape your ability',
        graphic: 'fragment',
        count: 3,
      },
    },
  }),
  mounted() {
    // eslint-disable-next-line prefer-destructuring
    this.step = this.steps[this.count];
    // setInterval(this.stepForward, 5000);
  },
  methods: {
    stepForward() {
      console.log(`setting to step ${this.count}`);
      if (Object.keys(this.steps).length > this.count) {
        this.step = this.steps[this.count];
        this.count += 1;
      } else {
        // eslint-disable-next-line prefer-destructuring
        this.step = this.steps[1];
        this.count = 1;
      }
    },
  },
};
</script>

<style lang="sass">
.builder-background
  background: black
  height: 100%
  width: 100%

.fragment
</style>
