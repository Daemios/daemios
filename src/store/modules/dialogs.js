export default {
  namespaced: true,
  state: {
    isEquipmentOpen: false,
    isInventoryOpen: false,
    isMapOpen: true,
  },
  mutations: {
    // Closers
    closeEquipment(state) {
      state.isEquipmentOpen = false;
    },
    closeInventory(state) {
      state.isInventoryOpen = false;
    },
    closeMap(state) {
      state.isMapOpen = false;
    },

    // Toggles
    toggleEquipment(state) {
      state.isEquipmentOpen = !state.isEquipmentOpen;
    },
    toggleInventory(state) {
      state.isInventoryOpen = !state.isInventoryOpen;
    },
    toggleMap(state) {
      state.isMapOpen = !state.isMapOpen;
    },
  },
};
