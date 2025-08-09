<template>
  <BasicDialog
    v-model="isOptionsOpen"
    title="Options"
    keybind="Esc"
  >
    Options
  </BasicDialog>
</template>

<script>
import { mdiClose } from '@mdi/js';
import BasicDialog from '@/components/dialogs/BasicDialog.vue';
import { useDialogsStore } from '@/stores/dialogsStore';

export default {
  components: {
    BasicDialog
  },
  data: () => ({
      mdiClose,
  }),
  computed: {
    isOptionsOpen: {
      get() { return useDialogsStore().isOptionsOpen; },
      set(v) { useDialogsStore().isOptionsOpen = v; },
    },
  },
};
</script>
