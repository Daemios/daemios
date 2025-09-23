<template>
  <v-dialog v-model="isCharacterOpen" scrollable>
    <v-container fluid>
      <v-row dense>
        <v-col cols="12" class="d-flex justify-end">
          <v-btn icon @click="close">
            <v-icon>
              {{ mdiClose }}
            </v-icon>
          </v-btn>
        </v-col>
      </v-row>

      <v-row dense>
        <!-- Left: Equipment Card -->
        <v-col cols="12" md="auto">
          <v-card class="pa-2" dense flat>
            <v-card-title>Equipment</v-card-title>
            <v-card-text>
              <PaperDoll />
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Right: Contextual (Inventory or Abilities) -->
        <v-col cols="12" md="auto" class="flex-grow-1">
          <v-card class="pa-2" dense flat>
            <v-card-title>
              <v-btn-toggle v-model="mode" mandatory dense>
                <v-btn value="inventory" dense> Inventory </v-btn>
                <v-btn value="abilities" dense> Abilities </v-btn>
              </v-btn-toggle>
            </v-card-title>
            <v-card-text>
              <component :is="modeComponent" />
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </v-dialog>
</template>

<script setup>
import { computed, ref } from "vue";
import PaperDoll from "@/components/character/PaperDoll.vue";
import InventoryPanel from "@/components/panels/InventoryPanel.vue";
import AbilitiesPanel from "@/components/panels/AbilitiesPanel.vue";
import { useDialogsStore } from "@/stores/dialogsStore";
import { mdiClose } from "@mdi/js";

const dialogs = useDialogsStore();
const isCharacterOpen = computed({
  get: () => dialogs.isCharacterOpen,
  set: (v) => (dialogs.isCharacterOpen = v),
});

const mode = ref("inventory");

function close() {
  isCharacterOpen.value = false;
}

const modeComponent = computed(() =>
  mode.value === "abilities" ? AbilitiesPanel : InventoryPanel
);
</script>
