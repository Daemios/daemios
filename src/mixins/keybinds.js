export default {
  created() {
    document.addEventListener('keyup', (event) => {
      console.log(event.code);
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
    });
  },
  destroyed() {
    document.removeEventListener('keyup', this.listener);
  },
};
