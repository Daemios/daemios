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
import { mapState } from 'vuex';
import BasicDialog from '@/components/dialogs/BasicDialog.vue';

export default {
  components: {
    BasicDialog
  },
  data: () => ({
      mdiClose,
  }),
  computed: {
    ...mapState({
      isOptionsOpen: state => state.dialogs.isOptionsOpen,
    }),
  }
};
</script>
