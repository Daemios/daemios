<template>
  <v-layout class="pa-4 flex-column align-center">
    <!-- Stage Selector -->
    <v-row class="mt-12">
      <v-col
        cols="auto"
        class="d-flex flex-column"
        style="padding-top: 224px"
      >
        <v-btn
          v-for="stage in stages"
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
                item-value="id"
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
              Review the character slide above and click "Create Character" to
              begin your adventure!
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

<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { useRouter } from "vue-router";
import { mdiCheck, mdiCircleMedium, mdiCircleSmall } from "@mdi/js";
import api from "@/utils/api";
import CharacterSlide from "@/components/character/CharacterSlide.vue";
import { useDataStore } from "@/stores/dataStore";
import { useUserStore } from "@/stores/userStore";

const router = useRouter();
const dataStore = useDataStore();
useUserStore();

const currentStage = ref("name");
const stages = ["name", "race", "avatar", "finish"];
const name = ref(null);
const race_id = ref(null);
const avatar = ref(null);
const hardcoded_races = {
  1: 11,
  2: 11,
  3: 11,
  4: 0,
  5: 19,
  6: 19,
  7: 16,
  8: 54,
  9: 0,
  10: 8,
  11: 1,
  12: 3,
};

const races = computed(() => dataStore.races || []);
const race = computed(() =>
  race_id.value ? races.value.find((r) => r.id === race_id.value) : {}
);

watch(race_id, () => {
  avatar.value = null;
});

onMounted(() => {
  dataStore.getRaces();
  // api.get('user/character/builder/presets').then(response => {
  //   presets.value = response;
  // });
});

function stepForward() {
  const index = stages.indexOf(currentStage.value);
  if (index < stages.length - 1) {
    currentStage.value = stages[index + 1];
  }
}

function stepBackward() {
  const index = stages.indexOf(currentStage.value);
  if (index > 0) {
    currentStage.value = stages[index - 1];
  }
}

function disableByStage(stage) {
  if (stage === "name" || stage === "race") {
    return !name.value;
  }
  if (stage === "avatar") {
    return !race_id.value;
  }
  if (stage === "finish") {
    return !avatar.value;
  }
  return false;
}

function navButtonIcon(stage) {
  if (stage === currentStage.value) {
    return mdiCircleMedium;
  }
  if (stages.indexOf(stage) < stages.indexOf(currentStage.value)) {
    return mdiCheck;
  }
  return mdiCircleSmall;
}

function buildAvatarUrl(image_index) {
  return `/img/avatars/${race.value["raceFolder"]}/${image_index}.png`;
}

function setAvatar(image_index) {
  avatar.value = buildAvatarUrl(image_index);
  currentStage.value = "finish";
}

async function createCharacter() {
  const req = { name: name.value, raceId: race_id.value, image: avatar.value };
  try {
    const response = await api.post("user/character/create", req);
    if (response && response.success) {
      router.push("/characters");
    }
  } catch (err) {
    console.warn("Character creation failed", err);
  }
}
</script>

<style></style>
