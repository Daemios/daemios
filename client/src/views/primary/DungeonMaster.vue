<template>
  <v-container class="align-start">
    <v-row>
      <v-col>
        <v-card>
          <v-card-title>
            Arena
            <v-spacer />
            <v-dialog v-model="create.show" max-width="800">
              <template #activator="{ props }">
                <v-btn
                  small
                  color="primary"
                  v-bind="props"
                  @click="create.show = true"
                >
                  <v-icon>
                    {{ mdiPlus }}
                  </v-icon>
                </v-btn>
              </template>
              <v-card>
                <v-card-title> Create Arena </v-card-title>
                <v-card-text>
                  <v-row>
                    <v-col>
                      <v-text-field v-model="create.name" label="Arena Name" />
                    </v-col>
                  </v-row>
                  <v-row>
                    <v-col>
                      <v-text-field
                        v-model="create.size"
                        type="number"
                        label="Arena Size"
                      />
                    </v-col>
                    <v-col>
                      <v-select label="Biome" />
                    </v-col>
                  </v-row>
                  <v-layout align-center>
                    <v-btn small elevation="0" @click="create.show = false">
                      Cancel
                    </v-btn>
                    <v-spacer />
                    <span class="success--text mr-2">{{ create.status }}</span>
                    <v-btn small color="primary" @click="createArena()">
                      <span>{{ create.status }}</span>
                    </v-btn>
                  </v-layout>
                </v-card-text>
              </v-card>
            </v-dialog>
          </v-card-title>
        </v-card>
      </v-col>
      <v-col>
        <v-card>
          <v-card-title>
            Combat
            <v-spacer />
            <v-btn v-if="!combat" small color="primary" @click="startCombat()">
              Start
            </v-btn>
            <v-btn v-if="combat" small color="primary" @click="endCombat()">
              End
            </v-btn>
          </v-card-title>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, reactive, onMounted } from "vue";
import api from "@/utils/api";
import { mdiPlus } from "@mdi/js";

const active_arena_history_id = ref(null);
const saved_arenas = ref([]);
const create = reactive({
  show: false,
  name: null,
  size: 16,
  status: null,
  calling: false,
});

onMounted(() => {
  api.get("arena/list").then((response) => {
    active_arena_history_id.value = response.active_arena_history_id;
    saved_arenas.value = response.saved_arenas;
  });
});

function createArena() {
  const body = { name: create.name, size: create.size };
  if (create.calling) return;
  create.calling = true;
  api.post("arena/create", body).then((response) => {
    if (response) {
      create.status = "Created";
      setTimeout(() => {
        saved_arenas.value = response;
        create.calling = false;
        create.show = false;
        create.name = null;
        create.size = 16;
        create.status = null;
      }, 1000);
    } else {
      create.status = "Error";
    }
  });
}

function startCombat() {
  api.post("dm/combat/start").then((response) => {
    if (response) {
      console.log(response);
    }
  });
}

function endCombat() {
  api.post("dm/combat/end").then((response) => {
    if (response) {
      console.log(response);
    }
  });
}

// loadArena and deleteArena were removed from the template; keep API helpers here if needed later
</script>
