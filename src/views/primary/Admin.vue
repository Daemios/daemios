<template>
  <v-container>
    <v-layout>
      <v-card>
        <v-card-title>Arena</v-card-title>
        <v-card-text>
          <v-dialog>
            <template #activator="{ on }">
              <v-btn
                color="primary"
                v-on="on"
              >
                Generate New
              </v-btn>
            </template>
          </v-dialog>
          <v-row>
            <v-col>
              Name
            </v-col>
            <v-col>
              Size
            </v-col>
            <v-col>
              Date
            </v-col>
            <v-col />
          </v-row>
          <v-row
            v-for="(row, i) in saved_arenas"
            :key="i"
          >
            <v-col>{{ row.name }}</v-col>
            <v-col>{{ row.size }}</v-col>
            <v-col>{{ row.date }}</v-col>
            <v-col>
              <v-btn @click="loadSeed()">
                Load
              </v-btn>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
    </v-layout>
  </v-container>
</template>

<script>
import api from '@/functions/api';

export default {
  data: () => ({
    saved_arenas: [],
  }),
  methods: {
    loadSeed() {
      api.post('arena/load')
      .then(response => {
        console.log(response)
      })
    }
  }
}
</script>
