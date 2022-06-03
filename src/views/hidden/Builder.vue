<template>
  <v-layout class="builder-background">
    <!-- Intro -->
    <v-layout
      v-if="stage === 'intro'"
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
          <VesselGraphic
            :element="$store.state.debug.db.elements[index-1]"
          />
        </v-col>
      </v-row>
      <CoresGraphic
        v-if="step.graphic === 'core'"
        class="core"
        :count="step.count"
      />

      <!-- Text -->
      <div
        class="square-peg text-h3 text white--text mt-12 text-center"
        style="height: 1px"
        v-html="step.text"
      />
    </v-layout>

    <!-- Core Selection -->
    <v-layout
      v-if="stage === 'ability-builder'"
    >
      <AbilityBuilder />
    </v-layout>
  </v-layout>
</template>

<script>
import VesselGraphic from '@/components/ability/VesselGraphic';
import CoresGraphic from '@/components/ability/CoresGraphic';
import AbilityBuilder from '@/components/ability/AbilityBuilder';

export default {
  components: {
    VesselGraphic,
    CoresGraphic,
    AbilityBuilder,
  },
  data: () => ({
    count: 0,
    step: {
      text: null,
      graphic: false,
    },
    steps: {
      0: {
        text: 'All adventurers use ancient relics called <strong>Vessels</strong>',
        graphic: 'vessel',
        count: 0,
      },
      1: {
        text: 'This is a <strong>Fire Vessel</strong>',
        graphic: 'vessel',
        count: 1,
      },
      2: {
        text: 'Vessels can be attuned to many <strong>different elements</strong>',
        graphic: 'vessel',
        count: 5,
      },
      4: {
        text: 'You can use Vessels to create combat and non-combat <strong>abilities</strong>',
        graphic: 'vessel',
        count: 2,
      },
      5: {
        text: 'In order to shape the elemental power of Vessels into a specific ability, you need a <strong>Core</strong>',
        graphic: 'core',
        count: 5,
      },
      6: {
        text: 'Cores can be found anywhere and each variation will <strong>determine the effect</strong> of the ability created',
        graphic: 'core',
        count: 5,
      },
      7: {
        text: 'Using <strong>Vessels</strong> and <strong>Cores</strong>, you can create different abilities depending on the specific combination',
        graphic: 'core',
        count: 5,
      },
      8: {
        text: 'One last thing to remember is that Vessels will come in varying degrees of <strong>quality</strong>',
        graphic: 'vessel',
        count: 5,
      },
      9: {
        text: 'Some may only be suited for small, <strong>non-combat</strong> effects',
        graphic: 'core',
        count: 3,
      },
      10: {
        text: 'Others Vessels may be so powerful they may be <strong>further augmented</strong>',
        graphic: 'core',
        count: 3,
      },
      11: {
        text: 'To summarize, you put a <strong>Core</strong> in a <strong>Vessel</strong> and you get an <strong>ability</strong>',
        graphic: 'core',
        count: 1,
      },
      12: {
        text: 'Choose your starting vessels and cores',
        graphic: 'vessel',
        count: 5,
      },
    },
    stage: 'ability-builder',
    abilities: {
      0: {},
      1: {},
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
      if (Object.keys(this.steps).length >= this.count) {
        this.step = this.steps[this.count];
        this.count += 1;
      } else {
        this.stage = 'ability-builder';
      }
    },
  },
};
</script>

<style lang="sass">
strong
  color: #49b69d

.builder-background
  background: black
  height: 100%
  width: 100%
</style>
