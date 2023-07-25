<template>
  <v-layout
    align-center
    justify-center
  >

    <!-- Archetype Role -->
    <!-- TODO replicate the cyberpunk background select screen here -->
    <v-row v-if="!character.archetype.role && !character.archetype.range">
      <v-col class="d-flex justify-center align-center">
        <FancyCarosel>
          <RoleCard
            v-for="role in $store.state.debug.db.archetype.roles"
            :key="role.archetype_role_id"
            :role="role"
          />
        </FancyCarosel>
      </v-col>
    </v-row>

    <!-- Archetype Range -->
    <v-row v-if="character.archetype.role && !character.archetype.range">
      <v-col>
        <RangeCard
          v-for="range in $store.state.debug.db.archetype.ranges"
          :key="range.archetype_range_id"
          :range="range"
        />
      </v-col>
    </v-row>

    <v-card
      v-if="character.archetype.role && character.archetype.range"
      class="pa-2 glass"
    >

      <!-- Character -->
      <v-row>
        <!-- Avatar -->
        <v-col cols="auto">
          <v-sheet
            height="500"
            width="300"
            class="rounded"
          >
            <v-dialog
              v-model="show.avatar"
              max-width="700"
            >
              <template #activator="{on}">
                <v-btn
                  style="height: 100%; width: 100%"
                  text
                  :disabled="!character.race && !character.avatar.image_index"
                  v-on="on"
                >
                  <div v-if="!character.race && !character.avatar.image_index">
                    <v-row>
                      <v-col><v-icon> {{ mdiLock }}</v-icon></v-col>
                    </v-row>
                    <v-row>
                      <v-col>
                        Choose a Race...
                      </v-col>
                    </v-row>

                  </div>
                  <v-icon v-else-if="!character.avatar.image_index">
                    {{ mdiPlus }}
                  </v-icon>
                  <v-img
                    v-else
                    height="500"
                    width="300"
                    class="rounded"
                    :src="buildAvatarUrl(character.avatar.image_index)"
                  />
                </v-btn>
              </template>
              <v-card class="pa-2 overflow-hidden">
                <v-row>
                  <v-col
                    v-for="image_index in hardcoded_races[character.race]"
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
              </v-card>
            </v-dialog>
            <v-img
              v-if="character.avatar.file"
              :src="buildAvatarUrl(character.avatar.image_index)"
            />
          </v-sheet>
        </v-col>
        <!-- Details -->
        <v-col class="d-flex flex-column">
          <v-row>
            <v-col>
              <v-text-field
                v-model="character.first_name"
                label="First Name"
              />
            </v-col>
            <v-col>
              <v-text-field
                v-model="character.last_name"
                label="First Name"
              />
            </v-col>
          </v-row>
          <v-select
            v-model="character.race"
            label="Race"
            placeholder="Select race..."
            :items="raceKeys"
            @change="character.avatar.image_index = null"
          />

          <!-- Ability 0 -->
          <v-layout align-center>
            <span>Starting Ability</span>
            <v-btn
              x-small
              class="ml-auto"
              color="primary"
            >
              Choose
            </v-btn>
          </v-layout>
          <Ability :ability_slot="0" />

          <!-- Ability 1 -->
          <v-layout align-center>
            <span>Supporting Ability</span>
            <v-btn
              x-small
              class="ml-auto"
              color="primary"
            >
              Choose
            </v-btn>
          </v-layout>
          <Ability :ability_slot="1" />
          <v-layout align-end>
            <v-btn
              small
              class="ml-auto"
              dense
            >
              Back to Characters
            </v-btn>
            <v-btn
              dense
              small
              class="ml-2"
              color="primary"
              @click="saveCharacter"
            >
              Create
            </v-btn>
          </v-layout>
        </v-col>
      </v-row>
    </v-card>
  </v-layout>
</template>

<script>
import { mapState } from 'vuex';
import FancyCarosel from "@/components/general/FancyCarosel";
import RoleCard from "@/components/character/archetype/RoleCard";
import RangeCard from "@/components/character/archetype/RangeCard";
import AbilityBuilder from '@/components/ability/AbilityBuilder';
import Ability from '@/components/ability/Ability';
import { mdiPencil, mdiPlus, mdiLock } from '@mdi/js';
import api from "@/functions/api";

export default {
  name: 'CharacterBuilder',
  components: {
    FancyCarosel,
    RoleCard,
    RangeCard,
    Ability,
    AbilityBuilder,
  },
  data() {
    return {
      mdiPencil,
      mdiPlus,
      mdiLock,
      editName: false,
      show: {
        avatar: false,
        ability: false,
      },
      character: {
        avatar: {
          image_index: null,
        },
        archetype: {
          range: null,
          role: null,
        },
        first_name: null,
        last_name: null,
        race: null,
      },
      presets: null,
      abilities: {
        0: {
          ability: null,
          selected: false,
        },
        1: {
          ability: null,
          selected: false,
        },
      },
      hardcoded_races: {
        // TODO improve with a image/race manager on backend
        // The key is the display name, the value is the # of images in folder
        Critterling: 16,
        Dwarf: 19,
        Elf: 11,
        Etter: 1,
        Human: 54,
        Savrian: 8,
        Special: 2,
        Tyrak: 3,
      }
    };
  },
  computed: {
    raceKeys() {
      return Object.keys(this.hardcoded_races);
    }
  },
  mounted() {
    api.get('user/character/builder/presets').then(response => {
      this.presets = response;
    });
    this.$store.dispatch('ability/getElements')
  },
  methods: {
    buildAvatarUrl(image_index) {
      return `/img/avatars/${this.character.race}/${image_index}.png`;
    },
    setAvatar(image_index) {
      this.show.avatar = false;
      this.character.avatar.image_index = image_index;
    },
    saveCharacter() {
      api.post('user/character/create', this.character).then(response => {
        this.$router.push({ name: 'Character', params: { id: response.id } });
      });
    },
  },
};
</script>



