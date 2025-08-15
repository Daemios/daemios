<template>
  <v-layout justify-center align-center column class="login">
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

      <div v-if="characters">
        <v-btn
          v-for="(char, i) in characters.slice(
            character_index,
            character_index + 5
          )"
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
                <v-icon small class="mr-1">
                  {{ isDangerousIcon(char.location) }}
                </v-icon>
                {{ char.location.name }}
              </div>
            </div>
            <v-layout column justify-end class="flex-grow-0">
              <v-layout justify-end>
                <span class="text-body mr-1">LV</span>
                <h3 class="text-h4 mt-n1">
                  {{ char.level }}
                </h3>
              </v-layout>
              <v-row dense>
                <v-col v-for="(v, i) in char.vessels" :key="i">
                  <VesselMini :color="v.color" />
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

      <v-layout style="width: 400px">
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
        <v-btn class="pane pa-2 mb-2" height="40" color="error" @click="logout">
          <v-icon small>
            {{ mdiLogout }}
          </v-icon>
          Log Out
        </v-btn>
      </v-layout>
    </v-layout>
  </v-layout>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import VesselMini from "@/components/ability/VesselMini.vue";
import {
  mdiPlus,
  mdiChevronUp,
  mdiChevronDown,
  mdiLogout,
  mdiSkull,
  mdiShield,
} from "@mdi/js";
import { useUserStore } from "@/stores/userStore";

const userStore = useUserStore();

const character_index = ref(0);

const characters = computed(() => userStore.characters || []);
const disableUp = computed(
  () => characters.value.length < 1 || character_index.value === 0
);
const disableDown = computed(
  () =>
    characters.value.length < 1 ||
    character_index.value + 5 >= characters.value.length
);

function isDangerousIcon(loc) {
  return loc.dangerous ? mdiSkull : mdiShield;
}

function isDangerousText(loc) {
  return loc.dangerous ? "red--text" : "green--text";
}

function characterUp() {
  if (character_index.value > 0) {
    character_index.value -= 5;
  }
}

function characterDown() {
  if (character_index.value + 5 < characters.value.length) {
    character_index.value += 5;
  }
}

function characterSelect(id) {
  userStore.selectCharacter(id);
}

function characterCreate() {
  window.location.href = "/builder";
}

function logout() {
  userStore.logout();
}

onMounted(() => {
  userStore.getCharacters();
});
</script>
