<template>
  <v-layout
    align-center
    column
    class="pa-4"
  >
    <!-- Stage Selector -->
    <v-row
      class="mt-12"
    >
      <v-col
        cols="auto"
        class="d-flex flex-column"
        style="padding-top: 224px"
      >
        <v-btn
          v-for="(stage) in stages"
          :key="stage"
          :value="stage"
          :input-value="currentStage === stage"
          text
          class="justify-start text-capitalize"
          :disabled="disableByStage(stage)"
          @click="currentStage = stage"
        >
          <v-icon class="mr-2">
            {{ navButtonIcon(stage) }}
          </v-icon>
          {{ stage }}
        </v-btn>
      </v-col>
      <v-col
        cols="auto"
        class="d-flex flex-column align-center"
      >
        <h1 class="mb-12">
          Character Creator
        </h1>
        <CharacterSlide
          :name="name"
          :color="race.color"
          :title="race.name"
          :avatar_url="avatar"
          class="mb-4"
        />
        <v-card
          tile
          :width="currentStage === 'avatar' ? '800' : '500'"
        >
          <v-card-text>
            <!-- Name -->
            <v-row v-if="currentStage === 'name'">
              <v-col>
                <v-text-field
                  v-model="name"
                  label="Name"
                  outlined
                  dense
                  required
                  hide-details
                />
              </v-col>
            </v-row>

            <!-- Race -->
            <v-layout
              v-else-if="currentStage === 'race'"
              column
            >
              <!-- Image selector to pick from races -->
              <v-select
                v-model="race_id"
                item-value="race_id"
                item-text="name"
                :items="races"
                class="mt-0 pt-0"
              />
              <v-sheet>
                {{ race.description }}
              </v-sheet>
            </v-layout>

            <!-- Avatar -->
            <v-row v-else-if="currentStage === 'avatar'">
              <v-col
                v-for="image_index in hardcoded_races[race_id]"
                :key="image_index"
              >
                <v-btn
                  height="300"
                  width="200"
                  @click="setAvatar(image_index)"
                >
                  <v-img
                    height="300"
                    width="200"
                    aspect-ratio="auto"
                    class="rounded"
                    :src="buildAvatarUrl(image_index)"
                  />
                </v-btn>
              </v-col>
            </v-row>

            <!-- Finish -->
            <div v-if="currentStage === 'finish'">
              Review the character slide above and click "Create Character" to begin your adventure!
            </div>
          </v-card-text>
          <v-card-actions>
            <v-btn
              v-if="currentStage !== 'name'"
              text
              color="primary"
              @click="stepBackward()"
            >
              Back
            </v-btn>
            <v-spacer />
            <v-btn
              v-if="currentStage !== 'avatar' && currentStage !== 'finish'"
              text
              color="primary"
              :disabled="disableByStage(currentStage)"
              @click="stepForward()"
            >
              Next
            </v-btn>
            <v-btn
              v-else-if="currentStage === 'finish'"
              color="primary"
              @click="createCharacter()"
            >
              Create Character
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-layout>
</template>

<script>

import { mdiCheck, mdiCircleMedium, mdiCircleSmall } from '@mdi/js';
import { mapState} from 'vuex';
import api from '@/functions/api';
import CharacterSlide from '@/components/character/CharacterSlide.vue';

export default {
  components: {CharacterSlide},
  data: () => ({
    currentStage: 'name',
    stages: [
      'name',
      'race',
      'avatar',
      'finish'
    ],
    name: null,
    race_id: null,
    avatar: null,
    hardcoded_races: {
      // TODO improve with a image/race manager on backend
      // The key is the race_id, the value is the # of images in folder
      1: 11, // elf
      2: 11, // elf
      3: 11, // elf
      4: 0, // orc
      5: 19, // dwarf
      6: 19, // dwarf
      7: 16, // critter
      8: 54, // human
      9: 0, // mantii
      10: 8, // savrian
      11: 1, // etter
      12: 3, // tyrak
    }
  }),
  computed: {
    ...mapState({
      races: state => state.data.races,
    }),
    // Find the race in races that has a race_id prop that matches the value in this.race
    race() {
      if (this.race_id) {
        return this.races.find(race => race.race_id === this.race_id);
      } else {
        return {};
      }
    },
  },
  watch: {
    race_id() {
      this.avatar = null;
    }
  },
  mounted() {
    this.$store.dispatch('data/getRaces')
    api.get('user/character/builder/presets').then(response => {
      this.presets = response;
    });
  },
  methods: {
    stepForward() {
      const index = this.stages.indexOf(this.currentStage);
      if (index < this.stages.length - 1) {
        this.currentStage = this.stages[index + 1];
      }
    },
    stepBackward() {
      const index = this.stages.indexOf(this.currentStage);
      if (index > 0) {
        this.currentStage = this.stages[index - 1];
      }
    },
    disableByStage(stage) {
      if (stage === 'name' || stage === 'race') {
        return !this.name;
      } else if (stage === 'avatar') {
        return !this.race_id;
      } else if (stage === 'finish') {
        return !this.avatar;
      }
      return false;
    },
    navButtonIcon(stage) {
      // return a medium circle if the stage is the current stage
      // return a check mark if the stage is complete
      // return a small circle if the stage is not yet reached
      if (stage === this.currentStage) {
        return mdiCircleMedium;
      } else if (this.stages.indexOf(stage) < this.stages.indexOf(this.currentStage)) {
        return mdiCheck;
      } else {
        return mdiCircleSmall;
      }
    },
    buildAvatarUrl(image_index) {
      return `/img/avatars/${this.race.race_folder}/${image_index}.png`;
    },
    setAvatar(image_index) {
      this.avatar = this.buildAvatarUrl(image_index);
      this.currentStage = 'finish';
    },
    createCharacter() {
      const req = {
        name: this.name,
        race_id: this.race_id,
      }
      api.post('user/character/create', req)
        .then(response => {
          if (response.success) {
            console.log('Character created!');
          } else {
            console.log('Character creation failed!');
            console.log(response.status)
            console.log(typeof response.status)
          }
        });
    },
  },
};
</script>

<style lang="sass">

</style>
