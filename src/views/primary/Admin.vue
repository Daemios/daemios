<template>
  <v-layout class="pa-4">
    <v-card>
      <v-card-title>
        Arena
        <v-spacer />
        <v-dialog
          max-width="800"
          :value="create.show"
        >
          <template #activator="{ on }">
            <v-btn
              color="primary"
              v-on="on"
              @click="create.show = true"
            >
              <v-icon>
                {{ mdiPlus }}
              </v-icon>
            </v-btn>
          </template>
          <v-card>
            <v-card-title>
              Create Arena
            </v-card-title>
            <v-card-text>
              <v-row>
                <v-col>
                  <v-text-field
                    v-model="create.name"
                    label="Arena Name"
                  />
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
              <v-layout>
                <v-btn elevation="0">
                  Cancel
                </v-btn>
                <v-spacer />
                <v-btn
                  color="primary"
                  @click="createArena()"
                >
                  Create
                </v-btn>
              </v-layout>
            </v-card-text>
          </v-card>
        </v-dialog>
      </v-card-title>
      <v-card-text>
        <v-row>
          <v-col cols="3">
            Name
          </v-col>
          <v-col cols="2">
            Size
          </v-col>
          <v-col cols="3">
            Date
          </v-col>
          <v-col cols="4">
            Actions
          </v-col>
        </v-row>
        <v-row
          v-for="(row, i) in saved_arenas"
          :key="i"
        >
          <v-col
            class="text-no-wrap"
            cols="3"
          >
            {{ row.name }}
          </v-col>
          <v-col
            cols="2"
            class="text-no-wrap"
          >
            {{ row.size }}
          </v-col>
          <v-col cols="3">
            {{ new Date(row.last_updated).toLocaleDateString('en-us') }}
          </v-col>
          <v-col
            cols="2"
          >
            <v-btn
              x-small
              color="primary"
              class="mr-1"
              @click="loadArena(row.arena_history_id)"
            >
              Load
            </v-btn>
          </v-col>
          <v-col cols="1">
            <v-btn
              x-small
              color="failure"
              @click="deleteArena(row.arena_history_id)"
            >
              <v-icon small>
                {{ mdiTrashCan }}
              </v-icon>
            </v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

  </v-layout>
</template>

<script>
import api from '@/functions/api';
import { mdiTrashCan, mdiPlus } from '@mdi/js'

export default {
  data: () => ({
    mdiTrashCan,
    mdiPlus,
    saved_arenas: [],
    create: {
      show: false,
      name: null,
      size: 16,
    },
  }),
  mounted() {
    api.get('arena/list')
      .then(response => {
        this.saved_arenas = response
      })
  },
  methods: {
    createArena() {
      const body = {
        name: this.create.name,
        size: this.create.size,
      }
      api.post('arena/create', body)
        .then(response => {
          if (response) {
            console.log(response)
            this.create.status = response.message;
            setTimeout(() => {
              this.create.show = false;
            }, 1000)
          } else {
            this.create.status = response;
          }
        })
    },
    loadArena(arena_history_id) {
      api.post(`arena/load/${arena_history_id}`)
      .then(response => {
        console.log(response)
      })
    },
    deleteArena(arena_history_id) {
      api.delete(`arena/single/${arena_history_id}`)
        .then(response => {
          if (response) {
            this.saved_arenas = response;
          }
        })
    }
  }
}
</script>
