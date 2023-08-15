<template>
  <v-layout
    justify-center
    align-center
    column
    class="login"
  >
    <AnimatedBackground
      src="/video/forest.mp4"
      :zoom="zoom"
    />


    <!-- Character Select -->
    <v-layout
      column
      align-center
      justify-center
      class="flex-grow-0"
    >
      <v-btn
        v-for="(char, i) in characters"
        :key="i"
        class="pane flex-grow-0 pa-2 mb-2"
        width="400"
        height="80"
        @click="characterSelect(char)"
      >
        <v-layout class="justify-space-between">
          <div>
            <h2 class="text-h4">
              {{ char.name }}
            </h2>
            <div
              class="location d-flex align-center"
              :class="isDangerousText(char.location)"
            >
              <v-icon
                small
                class="mr-1"
              >
                {{ isDangerousIcon(char.location) }}
              </v-icon>
              {{ char.location.name }}
            </div>
          </div>
          <v-layout
            column
            justify-end
            class="flex-grow-0"
          >
            <v-layout justify-end>
              <span class="text-body mr-1">LV</span>
              <h3 class="text-h4 mt-n1">
                {{ char.level }}
              </h3>
            </v-layout>
            <v-row dense>
              <v-col
                v-for="(v, i) in char.vessels"
                :key="i"
              >
                <VesselMini
                  :color="v.color"
                />
              </v-col>
            </v-row>
          </v-layout>
        </v-layout>
      </v-btn>
      <v-btn
        class="pane flex-grow-0 pa-2 mb-2"
        width="400"
        height="40"
        @click="characterCreate"
      >
        <v-icon>{{ mdiPlus }}</v-icon>
        Create New Character
      </v-btn>
    </v-layout>
  </v-layout>
</template>

<script>
import mixin_audio from '@/mixins/audio';
import mixin_locations from '@/mixins/locations';
import VesselMini from '@/components/ability/VesselMini';
import AnimatedBackground from '@/components/general/AnimatedBackground';
import { mdiPlus } from '@mdi/js';
import {mapState} from "vuex";

export default {
  components: { VesselMini, AnimatedBackground },
  mixins: [mixin_audio, mixin_locations],
  data() {
    return {
      zoom: false,
      mdiPlus,
    };
  },
  computed: {
    ...mapState({
      characters: (state) => state.user.characters,
    }),
  },
  mounted() {
    this.$store.dispatch('user/getCharacters');
  },
  methods: {
    characterSelect(char) {
      this.zoom = true;
      console.log(char);
      this.$store.dispatch('user/selectCharacter', char['character_id']);
    },
    characterCreate() {
      this.zoom = true;
      setTimeout(() => {
        window.location.href = '/builder';
      }, 1500);
    },
  },
}
</script>