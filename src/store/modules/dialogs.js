export default {
  namespaced: true,
  state: {
    isEquipmentOpen: false,
    isInventoryOpen: false,
  },
  mutations: {
    // Closers
    closeEquipment(state) {
      state.isEquipmentOpen = false;
    },
    closeInventory(state) {
      state.isInventoryOpen = false;
    },

    // Toggles
    toggleEquipment(state) {
      state.isEquipmentOpen = !state.isEquipmentOpen;
    },
    toggleInventory(state) {
      state.isInventoryOpen = !state.isInventoryOpen;
    },
  },
};
