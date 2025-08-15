<template>
  <BasicDialog
    v-model="isAbilitiesOpen"
    title="Abilities"
    keybind="A"
  >
    Ability Test
  </BasicDialog>
</template>

<script setup>
import BasicDialog from "@/components/dialogs/BasicDialog.vue";
import { useDialogsStore } from "@/stores/dialogsStore";
import { computed } from "vue";

const dialogsStore = useDialogsStore();
const isAbilitiesOpen = computed({
  get: () => dialogsStore.isAbilitiesOpen,
  set: (v) => (dialogsStore.isAbilitiesOpen = v),
});
</script>
