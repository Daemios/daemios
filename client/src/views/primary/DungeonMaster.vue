<template>
  <v-container class="align-start">
    <v-row>
      <v-col>
        <v-card>
          <v-card-title>
            Arena
            <v-spacer />
            <v-dialog
              max-width="800"
              v-model="create.show"
            >
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
                  <v-layout align-center>
                    <v-btn
                      small
                      elevation="0"
                      @click="create.show = false"
                    >
                      Cancel
                    </v-btn>
                    <v-spacer />
                    <span class="success--text mr-2">{{ create.status }}</span>
                    <v-btn
                      small
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
            <v-data-table
              dark
              :headers="headers"
              :items="saved_arenas"
            >
              <template
                v-for="header in headers.filter((header) => header.format)"
                #[`item.${header.value}`]="{ value }"
              >
                {{ new Date(value).toLocaleDateString('en-us', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute:'2-digit'
                }) }}
              </template>
              <template #item.actions="{ item }">
                <v-btn
                  x-small
                  min-width="66"
                  color="primary"
                  class="mr-1"
                  :disabled="item.arena_history_id === active_arena_history_id"
                  @click="loadArena(item.arena_history_id)"
                >
                  {{ item.arena_history_id === active_arena_history_id ? 'Loaded' : 'Load' }}
                </v-btn>
                <v-dialog
                  v-model="delete_dialog"
                  max-width="400"
                >
                  <template #activator="{ props }">
                    <v-btn
                      x-small
                      color="failure"
                      v-bind="props"
                      @click="delete_dialog = true"
                    >
                      <v-icon small>
                        {{ mdiTrashCan }}
                      </v-icon>
                    </v-btn>
                  </template>
                  <v-card>
                    <v-card-title>
                      Delete Arena
                    </v-card-title>
                    <v-card-text>
                      Are you sure you want to delete this arena?
                    </v-card-text>
                    <v-card-actions>
                      <v-spacer />
                      <v-btn
                        x-small
                        color="secondary"
                        @click="delete_dialog = false"
                      >
                        Cancel
                      </v-btn>
                      <v-btn
                        x-small
                        color="error"
                        @click="deleteArena(item.arena_history_id)"
                      >
                        Delete
                      </v-btn>
                    </v-card-actions>
                  </v-card>
                </v-dialog>
              </template>
            </v-data-table>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col>
        <v-card>
          <v-card-title>
            Combat
            <v-spacer />
            <v-btn
              v-if="!combat"
              small
              color="primary"
              @click="startCombat()"
            >
              Start
            </v-btn>
            <v-btn
              v-if="combat"
              small
              color="primary"
              @click="endCombat()"
            >
              End
            </v-btn>
          </v-card-title>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import api from '@/functions/api';
import { mdiTrashCan, mdiPlus } from '@mdi/js'

export default {
  data: () => ({
    mdiTrashCan,
    mdiPlus,
    delete_dialog: false,
    active_arena_history_id: null,
    headers: [
      {text: 'Name', value: 'name'},
      {text: 'Size', value: 'size'},
      {text: 'Date', value: 'last_active', format: true},
      {text: 'Actions', value: 'actions'},
    ],
    saved_arenas: [],
    create: {
      show: false,
      name: null,
      size: 16,
      status: null,
      calling: false,
    },
  }),
  mounted() {
    api.get('arena/list')
      .then(response => {
        this.active_arena_history_id = response.active_arena_history_id;
        this.saved_arenas = response.saved_arenas;
      })
  },
  methods: {
    createArena() {
      const body = {
        name: this.create.name,
        size: this.create.size,
      }
      if (this.create.calling) {
        return;
      }
      this.create.calling = true;
      api.post('arena/create', body)
        .then(response => {
          if (response) {
            this.create.status = 'Created';
            setTimeout(() => {
              this.saved_arenas = response;
              this.create.calling = false;
              this.create.show = false;
              this.create.name = null;
              this.create.size = 16;
              this.create.status = null;
            }, 1000)
          } else {
            this.create.status = 'Error';
          }
        })
    },
    startCombat() {
      api.post('dm/combat/start')
        .then(response => {
          if (response) {
            console.log(response);
          }
        })
    },
    endCombat() {
      api.post('dm/combat/end')
        .then(response => {
          if (response) {
            console.log(response);
          }
        })
    },
    loadArena(arena_history_id) {
      api.post(`arena/load/${arena_history_id}`)
      .then(response => {
        this.active_arena_history_id = response.active_arena_history_id;
        this.saved_arenas = response.saved_arenas;
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
