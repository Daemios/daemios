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
      console.log(event.code);
      if (!this.enabled) {
        console.log('keybinds not enabled');
        return;
      }
      switch (event.code) {
        case 'Escape':
          this.$store.commit('dialogs/closeEquipment');
          this.$store.commit('dialogs/closeInventory');
          break;
        case 'KeyC':
          this.$store.commit('dialogs/toggleEquipment');
          break;
        case 'KeyI':
          this.$store.commit('dialogs/toggleInventory');
          break;
        default: break;
      }
    },
    keybindDisable(event) {
      if (event.target.tagName.toUpperCase() === 'INPUT') {
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
