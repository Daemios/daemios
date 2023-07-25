<template>
  <v-layout>
    <v-row>
      <!-- Vessel Icon -->
      <v-col>
        <VesselMini
          :color="color"
        />
      </v-col>
      <!-- Details -->
      <v-col>
        <div>{{ ability.name }}</div>
        <AbilityMockup
          :height="5"
          :width="5"
          :key_prefix="ability.element.name"
        />
      </v-col>
    </v-row>
  </v-layout>
</template>

<script>
import AbilityMockup from '@/components/ability/AbilityMockup';
import VesselMini from '@/components/ability/VesselMini';
import {mapState} from "vuex";

export default {
  components: {
    AbilityMockup,
    VesselMini,
  },
  data() {
    return {
      ability: {
        name: 'Ability Name',
        element: 'fire',
      },
    };
  },
  computed: {
    ...mapState({
      elements: (state) => state.ability.elements,
    })
  },
}
</script>