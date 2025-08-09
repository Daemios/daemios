<template>
  <BasicDialog
    v-model="isAbilitiesOpen"
    title="Abilities"
    keybind="A"
  >
    Ability Test
  </BasicDialog>
</template>

<script>
import { mdiClose } from '@mdi/js';
import BasicDialog from '@/components/dialogs/BasicDialog.vue';
import { useDialogsStore } from '@/stores/dialogsStore';

export default {
  components: {
    BasicDialog,
  },
  data: () => ({
      mdiClose,
  }),
  computed: {
    isAbilitiesOpen: {
      get() { return useDialogsStore().isAbilitiesOpen; },
      set(v) { useDialogsStore().isAbilitiesOpen = v; },
    },
  },
};
</script>
