<template>
  <BasicDialog v-model="isEquipmentOpen" title="Equipment" keybind="C">
    <PaperDoll />
  </BasicDialog>
</template>

<script setup>
import PaperDoll from "@/components/character/PaperDoll.vue";
import BasicDialog from "@/components/dialogs/BasicDialog.vue";
import { useDialogsStore } from "@/stores/dialogsStore";
import { computed } from "vue";

const dialogsStore = useDialogsStore();
const isEquipmentOpen = computed({
  get: () => dialogsStore.isEquipmentOpen,
  set: (val) => (dialogsStore.isEquipmentOpen = val),
});
</script>
