<template>
  <v-container>
    <v-row dense>
      <v-col>
        <v-row dense>
          <v-col
            v-for="(core, idx) in coresArr"
            :key="core.id || idx"
            cols="3"
            class="d-flex flex-column align-center"
          >
            <v-btn
              class="ability-item ma-1"
              dense
            >
              <div
                class="ability-item-inner d-flex align-center justify-center"
                style="position: relative"
              >
                <AbilityMockup
                  :height="5"
                  :width="5"
                  :block-size="6"
                  :pattern="core.pattern || null"
                  :key_prefix="core.id || idx"
                />
                <div style="position: absolute; right: -6px; bottom: -6px">
                  <VesselMini :color="elementColor(core)" />
                </div>
              </div>
            </v-btn>
            <div class="text-caption mt-2">
              {{ core.label || core.prefix || "Core " + core.id }}
            </div>
          </v-col>
        </v-row>
      </v-col>
    </v-row>
    <v-row class="mt-4">
      <v-col>
        <AbilitiesSlots
          @ability-drop="(p) => $emit('ability-drop', p)"
          @ability-click="(i) => $emit('ability-click', i)"
        />
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { computed, onMounted } from "vue";
import { useAbilityStore } from "@/stores/abilityStore";
import { useUserStore } from "@/stores/userStore";
import VesselMini from "@/components/ability/VesselMini.vue";
import AbilityMockup from "@/components/ability/AbilityMockup.vue";
import AbilitiesSlots from "@/components/abilities/AbilitiesSlots.vue";
defineEmits(['ability-drop', 'ability-click']);

const abilityStore = useAbilityStore();
const userStore = useUserStore();

const coresArr = computed(() => {
  const cores = userStore.character && userStore.character.cores;
  if (!cores) return [];
  if (Array.isArray(cores)) return cores;
  return Object.values(cores);
});

function elementColor(core) {
  if (!abilityStore.elements) return "#888";
  const el = abilityStore.elements.find(
    (e) => e.element_id === core.element || e.id === core.element
  );
  return el ? el.color : "#888";
}

onMounted(() => {
  abilityStore.loadAll().catch((e) => console.error(e));
});
</script>

<style scoped></style>
