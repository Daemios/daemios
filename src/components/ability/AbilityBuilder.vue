<template>
  <v-container
    class="ability-builder d-flex flex-column align-center justify-center"
  >
    <v-row
      class="builder-vessels"
      align="end"
    >
      <v-col>
        <v-card
          class="glass flex-grow-1"
        >
          <v-card-title>
            <h1>
              {{ element ? `${element.name} Vessel` : 'Choose a Vessel' }}
            </h1>
          </v-card-title>
          <v-card-text>
            <v-layout justify-space-between>
              <v-btn
                v-for="(el, i) in $store.state.debug.db.elements"
                :key="i"
                fab
                small
                @click="element = el"
              >
                <VesselMini :color="el.color" />
              </v-btn>
            </v-layout>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
    <v-row
      class="builder-cores"
    >
      <v-col
        v-for="(core, i) in $store.state.debug.db.cores"
        :key="i"
        cols="4"
        class="flex-grow-1"
      >
        <v-card
          class="glass"
        >
          <v-card-title class="d-flex justify-space-between align-start">

            <v-layout
              column
              justify-start
            >
              {{ core.name }}
              <div
                class="text-caption"
              >
                {{ coreType(core) }}
              </div>
            </v-layout>
            <v-btn
              x-small
              color="primary"
              :disabled="!element"
            >
              {{ element ? 'Select' : 'Awaiting Element' }}
            </v-btn>
          </v-card-title>
          <v-card-text>{{ coreDescription(core) }}</v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import { mdiClose } from '@mdi/js';
import { mapState } from 'vuex';
import VesselMini from '@/components/ability/VesselMini';

export default {
  components: { VesselMini },
  props: {
    ability: {
      type: Object,
      required: true,
    },
  },
  data: () => ({
    mdiClose,
    element: null,
  }),
  computed: {
    ...mapState({
      elements: (state) => state.debug.db.elements,
      cores: (state) => state.debug.db.cores,
      core_effects: (state) => state.debug.db.core_effects,
    }),
  },
  methods: {
    coreType(core) {
      if (!this.element) {
        const data = this.cores.filter((el) => el.tag === core.tag);
        return data[0].type ? data[0].type : '';
      }
      const { type } = this.core_effects[core.tag][this.element.tag];
      return type ? `${type} - ${this.element.name} ` : 'Unavailable';
    },
    coreDescription(core) {
      if (!this.element) {
        const data = this.cores.filter((el) => el.tag === core.tag);
        return data[0].description ? data[0].description : 'Not Implemented';
      }
      return this.core_effects[core.tag][this.element.tag].description
        ? this.core_effects[core.tag][this.element.tag].description : 'This core provides nothing for this element';
    },
  },
};
</script>

<style lang="sass">
.ability-builder
  &>*
    width: 100%

.builder-vessels
  flex: 1

.builder-cores
  flex: 2
</style>
