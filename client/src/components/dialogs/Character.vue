<template>
  <BasicDialog
    v-model="isCharacterOpen"
    title="Character"
    keybind="C"
    :max-width="1180"
  >
    <v-container fluid class="character-dialog pa-0">
      <v-row class="ma-0" align="stretch">
        <v-col cols="12" md="5" class="d-flex">
          <v-sheet
            color="surface"
            class="character-dialog__sheet w-100 pa-4 rounded-xl elevation-3 d-flex justify-center"
          >
            <PaperDoll />
          </v-sheet>
        </v-col>
        <v-col cols="12" md="7" class="d-flex">
          <ContainerTabs class="w-100" />
        </v-col>
      </v-row>
    </v-container>
  </BasicDialog>
</template>

<script setup>
import { computed } from "vue";
import PaperDoll from "@/components/character/PaperDoll.vue";
import ContainerTabs from "@/components/character/ContainerTabs.vue";
import BasicDialog from "@/components/dialogs/BasicDialog.vue";
import { useDialogsStore } from "@/stores/dialogsStore";

const dialogsStore = useDialogsStore();

const isCharacterOpen = computed({
  get: () => dialogsStore.isCharacterOpen,
  set: (val) => {
    dialogsStore.isCharacterOpen = val;
  },
});
</script>

<style scoped>
.character-dialog__sheet {
  min-height: 100%;
  background: linear-gradient(160deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0));
  border: 1px solid rgba(255, 255, 255, 0.05);
}
</style>
