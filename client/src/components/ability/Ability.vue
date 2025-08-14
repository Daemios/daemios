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

<script setup>
import AbilityMockup from '@/components/ability/AbilityMockup.vue';
import VesselMini from '@/components/ability/VesselMini.vue';
import { useAbilityStore } from '@/stores/abilityStore';
import { reactive, computed } from 'vue';

defineProps({
  color: {
    type: String,
    required: true,
  },
});

const ability = reactive({
  name: 'Ability Name',
  element: { name: 'fire' },
});

const elements = computed(() => useAbilityStore().elements || {});
</script>
