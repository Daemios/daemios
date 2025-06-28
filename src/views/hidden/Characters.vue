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
      style="height: 584px"
    >
      <v-btn
        v-if="characters && characters.length > 5"
        class="pane flex-grow-0 pa-2 mb-2"
        width="400"
        height="40"
        :disabled="disableUp"
        @click="characterUp"
      >
        <v-icon>{{ mdiChevronUp }}</v-icon>
      </v-btn>

      <div
        v-if="characters"
      >
        <v-btn
          v-for="(char, i) in characters.slice(character_index, character_index + 5)"
          :key="i"
          class="pane flex-grow-0 pa-2 mb-2"
          width="400"
          height="80"
          @click="characterSelect(char.id)"
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
      </div>

      <v-btn
        v-if="characters && characters.length > 5"
        class="pane flex-grow-0 pa-2 mb-2 mt-auto"
        width="400"
        height="40"
        :disabled="disableDown"
        @click="characterDown"
      >
        <v-icon>{{ mdiChevronDown }}</v-icon>
      </v-btn>

      <v-layout style="width: 400px;">
        <v-btn
          class="pane pa-2 mb-2"
          height="40"
          color="success"
          @click="characterCreate"
        >
          <v-icon>{{ mdiPlus }}</v-icon>
          Create New Character
        </v-btn>
        <v-spacer />
        <v-btn
          class="pane pa-2 mb-2"
          height="40"
          color="error"
          @click="logout"
        >
          <v-icon small>
            {{ mdiLogout }}
          </v-icon>
          Log Out
        </v-btn>
      </v-layout>
    </v-layout>
  </v-layout>
</template>

<script>
import mixin_audio from '@/mixins/audio';
import mixin_locations from '@/mixins/locations';
import VesselMini from '@/components/ability/VesselMini';
import AnimatedBackground from '@/components/general/AnimatedBackground';
import { mdiPlus, mdiChevronUp, mdiChevronDown, mdiLogout } from '@mdi/js';
import {mapState} from "vuex";

export default {
  components: { VesselMini, AnimatedBackground },
  mixins: [mixin_audio, mixin_locations],
  data: () => ({
      zoom: false,
      character_index: 0, // shows i+5 characters
      mdiPlus,
      mdiChevronUp,
      mdiChevronDown,
      mdiLogout,
  }),
  computed: {
    ...mapState({
      characters: (state) => state.user.characters,
    }),
    disableUp() {
      return this.characters.length < 1 || this.character_index === 0;
    },
    disableDown() {
      return this.characters.length < 1 || this.character_index + 5 >= this.characters.length;
    },
  },
  mounted() {
    this.$store.dispatch('user/getCharacters');
  },
  methods: {
    characterUp() {
      if (this.character_index > 0) {
        this.character_index -= 5;
      }
    },
    characterDown() {
      if (this.character_index + 5 < this.characters.length) {
        this.character_index += 5;
      }
    },
    characterSelect(id) {
      this.zoom = true;
      this.$store.dispatch('user/selectCharacter', id);
    },
    characterCreate() {
      this.zoom = true;
      setTimeout(() => {
        window.location.href = '/builder';
      }, 1500);
    },
    logout() {
      this.$store.dispatch('user/logout');
    },
  },
}
</script>