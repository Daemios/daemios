<template>
  <v-container
    class="ability-builder d-flex flex-column align-center justify-center"
  >
    <v-row class="builder-vessels" align="end">
      <v-col cols="7">
        <v-card class="glass" height="200">
          <v-card-title>
            <h1>
              {{
                selected_element
                  ? `${elements[selected_element].name} Vessel`
                  : "Choose a Vessel"
              }}
            </h1>
          </v-card-title>
          <v-card-text>
            <v-btn
              v-for="(el, i) in elements"
              :key="i"
              fab
              small
              class="ma-2"
              @click="selected_element = el.element_id"
            >
              <VesselMini :color="el.color" />
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col>
        <v-card class="glass fill-height" min-height="200">
          <v-card-text>
            <h2>About Vessels</h2>
            <div>
              Using multiple types of Elements reduces your overall power.
            </div>
            <h2 v-if="selected_element" class="mt-4">
              <v-layout>
                {{ elements[selected_element].name }} Effect
                <VesselMini
                  class="ml-2"
                  :color="elements[selected_element].color"
                />
              </v-layout>
            </h2>
            <p v-if="selected_element">
              {{ elements[selected_element].effect }}
            </p>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
    <v-row class="builder-cores">
      <v-col
        v-for="preset_core_id in core_options"
        :key="preset_core_id"
        cols="4"
      >
        <v-card class="glass" height="300">
          <v-card-title class="d-flex justify-space-between align-start">
            <v-layout column justify-start>
              {{
                selected_element
                  ? presets[preset_core_id][selected_element].preset_core_name
                  : ""
              }}
              <div class="text-caption">
                {{ abilitySubtext(preset_core_id, selected_element) }}
              </div>
            </v-layout>
            <v-btn x-small color="primary" :disabled="!selected_element">
              {{ selected_element ? "Select" : "Awaiting Element" }}
            </v-btn>
          </v-card-title>
          <v-card-text>
            {{
              selected_element
                ? presets[preset_core_id][selected_element].preset_description
                : ""
            }}

            <AbilityMockup
              v-if="selected_element"
              :key_prefix="selected_element"
              :height="10"
              :width="10"
            />
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { useAbilityStore } from "@/stores/abilityStore";
import VesselMini from "@/components/ability/VesselMini.vue";
import AbilityMockup from "@/components/ability/AbilityMockup.vue";
import { ref, computed } from "vue";

const props = defineProps({
  ability: {
    type: Object,
    required: true,
  },
  presets: {
    type: Object,
    required: true,
  },
  core_options: {
    type: Array,
    required: true,
  },
});

const selected_element = ref(null);
const elements = computed(() => useAbilityStore().elements || {});

function abilitySubtext(preset_core_id, selectedElement) {
  if (!selectedElement) {
    return "";
  }
  const preset = props.presets[preset_core_id][selectedElement];
  return `${preset.type_name} - ${elements.value[selectedElement].name}`;
}
</script>

<style>
.ability-builder > * {
  width: 100%;
}
</style>
