export default {
  data: () => ({
    keybinds_enabled: true,
    keybind_listeners: {
      keybind: null,
      focusIn: null,
      focusOut: null,
    },
  }),
  methods: {
  async handleKeypress(event) {
      if (!this.keybinds_enabled) {
        return;
      }
  const { useDialogsStore } = await import('@/stores/dialogsStore');
  const dialogsStore = useDialogsStore();
      switch (event.code) {
        case 'Escape':
          if (dialogsStore.isEquipmentOpen || dialogsStore.isInventoryOpen || dialogsStore.isAbilitiesOpen || dialogsStore.isOptionsOpen) {
            dialogsStore.closeEquipment();
            dialogsStore.closeInventory();
            dialogsStore.closeAbilities();
            dialogsStore.closeOptions();
          } else dialogsStore.toggleOptions();
          break;
        case 'KeyC':
          dialogsStore.toggleEquipment();
          break;
        case 'KeyA':
          dialogsStore.toggleAbilities();
          break;
        case 'KeyI':
          dialogsStore.toggleInventory();
          break;
        default: break;
      }
    },
    keybindDisable(event) {
      if (event.target.tagName.toUpperCase() === 'INPUT') {
        console.log('keys disabled');
        this.keybinds_enabled = false;
      }
    },
    keybindEnable() {
      this.keybinds_enabled = true;
    },
  },
  created() {
    document.addEventListener('keyup', this.handleKeypress);
    document.addEventListener('focusin', this.keybindDisable);
    document.addEventListener('focusout', this.keybindEnable);
  },
  beforeUnmount() {
    document.removeEventListener('keyup', this.handleKeypress);
    document.removeEventListener('focusin', this.keybindDisable);
    document.removeEventListener('focusout', this.keybindEnable);
  },
};
