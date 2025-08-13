<template>
  <BasicDialog
    v-model="isEquipmentOpen"
    title="Equipment"
    keybind="C"
  >
    <PaperDoll />
  </BasicDialog>
</template>

<script>
import { mdiClose } from '@mdi/js';
import PaperDoll from '@/components/character/PaperDoll.vue';
import BasicDialog from '@/components/dialogs/BasicDialog.vue';
import { useDialogsStore } from '@/stores/dialogsStore';

export default {
  components: {
    BasicDialog,
    PaperDoll,
  },
  data: () => ({
      mdiClose,
  }),
  computed: {
    isEquipmentOpen: {
      get() { return useDialogsStore().isEquipmentOpen; },
      set(val) { useDialogsStore().isEquipmentOpen = val; },
    },
  },
};
</script>
