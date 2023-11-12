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
    handleKeypress(event) {
      if (!this.keybinds_enabled) {
        return;
      }
      switch (event.code) {
        case 'Escape':
          if (
            this.$store.state.dialogs.isEquipmentOpen ||
            this.$store.state.dialogs.isInventoryOpen ||
            this.$store.state.dialogs.isAbilitiesOpen ||
            this.$store.state.dialogs.isOptionsOpen
          ) {
            this.$store.commit('dialogs/closeEquipment');
            this.$store.commit('dialogs/closeInventory');
            this.$store.commit('dialogs/closeAbilities');
            this.$store.commit('dialogs/closeOptions');
          } else {
            this.$store.commit('dialogs/toggleOptions');
          }
          break;
        case 'KeyC':
          this.$store.commit('dialogs/toggleEquipment');
          break;
        case 'KeyA':
          this.$store.commit('dialogs/toggleAbilities');
          break;
        case 'KeyI':
          this.$store.commit('dialogs/toggleInventory');
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
  beforeDestroy() {
    document.removeEventListener('keyup', this.handleKeypress);
    document.removeEventListener('focusin', this.keybindDisable);
    document.removeEventListener('focusout', this.keybindEnable);
  },
};
