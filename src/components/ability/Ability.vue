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
import AbilityMockup from '@/components/ability/AbilityMockup.vue';
import VesselMini from '@/components/ability/VesselMini.vue';
import { useAbilityStore } from '@/stores/abilityStore';

export default {
  components: {
    AbilityMockup,
    VesselMini,
  },
  data: () => ({
      ability: {
        name: 'Ability Name',
        element: 'fire',
      },
  }),
  computed: {
    elements() { return useAbilityStore().elements || {}; },
  },
}
</script>