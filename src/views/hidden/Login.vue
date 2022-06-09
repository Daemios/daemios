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

    <v-layout
      v-if="!characters"
      column
      class="flex-grow-0 mb-2"
      align-center
    >
      <h1 class="header text-center colors-of-autumn">
        Dungeons and Daemios
      </h1>
      <div class="login-pane pane pa-4">
        <v-text-field
          label="Username"
          type="username"
          @keydown.enter="authenticate"
        />
        <v-text-field
          label="Password"
          type="password"
          @keydown.enter="authenticate"
        />
      </div>
    </v-layout>
    <v-layout
      v-else
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
    <div
      class="audio-pane pane d-flex justify-space-between px-1"
    >
      <v-icon
        class="mr-1"
        @click="$store.commit('audio/toggleMute')"
      >
        {{ mdiVolumeSource }}
      </v-icon>
      <v-slider
        dense
        hide-details
        :value="volume"
      />
    </div>
  </v-layout>
</template>

<script>
import { mdiPlus } from '@mdi/js';
import mixin_audio from '@/mixins/audio';
import mixin_locations from '@/mixins/locations';
import VesselMini from '@/components/ability/VesselMini';
import AnimatedBackground from '@/components/general/AnimatedBackground';

export default {
  components: { VesselMini, AnimatedBackground },
  mixins: [mixin_audio, mixin_locations],
  data: () => ({
    mdiPlus,
    character: null,
    characters: null,
    characters_temp: [
      {
        name: 'Daemios',
        level: 5,
        location: {
          name: 'The Wilds',
          dangerous: true,
        },
        vessels: [
          { color: 'red' },
          { color: 'red' },
          { color: 'red' },
          { color: 'orange' },
        ],
      },
      {
        name: 'Asori',
        level: 3,
        location: {
          name: 'Gondor',
          dangerous: false,
        },
        vessels: [
          { color: 'teal' },
          { color: 'turquoise' },
          { color: 'green' },
        ],
      },
    ],
    zoom: false,
  }),
  computed: {
  },
  methods: {
    authenticate() {
      this.characters = this.characters_temp;
    },
    characterSelect(char) {
      console.log(char);
      this.zoom = true;
      setTimeout(() => {
        window.location.href = '/world';
      }, 1500);
    },
    characterCreate() {
      this.zoom = true;
      setTimeout(() => {
        window.location.href = '/builder';
      }, 1500);
    },
  },
};
</script>

<style lang="sass">
@keyframes login-zoom
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

.header
  z-index: 100
  font-size: 10rem
  text-shadow: -1px 0 black, 0 1px black, 1px 0 black, 0 -1px black
  user-select: none

.login
  height: 100vh
  overflow: hidden

.pane
  z-index: 100
  border-radius: 4px
  background: rgba(0,0,0,.5) !important

.login-pane
  width: 400px

.audio-pane
  width: 200px

</style>
