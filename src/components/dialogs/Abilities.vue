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
import { mapState } from 'vuex';

export default {
  components: {
    BasicDialog,
  },
  data: () => ({
      mdiClose,
  }),
  computed: {
    ...mapState({
      isAbilitiesOpen: state => state.dialogs.isAbilitiesOpen,
    }),
  }
};
</script>
