<template>
  <BasicDialog
    v-model="isAbilitiesOpen"
    title="Abilities"
    keybind="A"
  >
    <v-container>
      <v-row>
        <v-col>
          <v-row>
            <v-col
              v-for="(core, idx) in coresArr"
              :key="core.id || idx"
              cols="3"
              class="d-flex flex-column align-center"
            >
              <v-btn class="ability-item ma-2">
                <div
                  class="ability-item-inner d-flex align-center justify-center"
                  style="position: relative;"
                >
                  <AbilityMockup
                    :height="5"
                    :width="5"
                    :block-size="6"
                    :pattern="core.pattern || null"
                    :key_prefix="core.id || idx"
                  />
                  <div style="position: absolute; right: -6px; bottom: -6px;">
                    <VesselMini :color="elementColor(core)" />
                  </div>
                </div>
              </v-btn>
              <div class="text-caption mt-2">
                {{ core.label || core.prefix || ('Core ' + core.id) }}
              </div>
            </v-col>
          </v-row>
        </v-col>
      </v-row>
    </v-container>
  </BasicDialog>
</template>

<script setup>
import BasicDialog from "@/components/dialogs/BasicDialog.vue";
import { useDialogsStore } from "@/stores/dialogsStore";
import { useAbilityStore } from "@/stores/abilityStore";
import { computed, onMounted } from "vue";
import VesselMini from "@/components/ability/VesselMini.vue";

const dialogsStore = useDialogsStore();
const isAbilitiesOpen = computed({
  get: () => dialogsStore.isAbilitiesOpen,
  set: (v) => (dialogsStore.isAbilitiesOpen = v),
});

const abilityStore = useAbilityStore();
import { useUserStore } from "@/stores/userStore";
const userStore = useUserStore();

const coresArr = computed(() => {
  const cores = userStore.character && userStore.character.cores;
  if (!cores) return [];
  // cores may be an object keyed by id; convert to array
  if (Array.isArray(cores)) return cores;
  return Object.values(cores);
});

function elementColor(core) {
  // core.element may be an id that maps to abilityStore.elements
  if (!abilityStore.elements) return "#888";
  const el = abilityStore.elements.find((e) => e.element_id === core.element || e.id === core.element);
  return el ? el.color : "#888";
}

onMounted(() => {
  // Load ability metadata (elements/shapes) so colors are available
  abilityStore.loadAll().catch((e) => console.error(e));
});
</script>
