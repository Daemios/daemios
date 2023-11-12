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
import PaperDoll from '@/components/character/PaperDoll';
import BasicDialog from '@/components/dialogs/BasicDialog.vue';
import { mapState } from 'vuex';

export default {
  components: {
    BasicDialog,
    PaperDoll,
  },
  data: () => ({
      mdiClose,
  }),
  computed: {
    ...mapState({
      isEquipmentOpen: state => state.dialogs.isEquipmentOpen,
    }),
  }
};
</script>
