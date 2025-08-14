<template>
  <BasicDialog
    v-model="isOptionsOpen"
    title="Options"
    keybind="Esc"
  >
    Options
  </BasicDialog>
</template>

<script setup>
import BasicDialog from '@/components/dialogs/BasicDialog.vue';
import { useDialogsStore } from '@/stores/dialogsStore';
import { computed } from 'vue';

const dialogsStore = useDialogsStore();
const isOptionsOpen = computed({
  get: () => dialogsStore.isOptionsOpen,
  set: (v) => (dialogsStore.isOptionsOpen = v),
});
</script>
