export default {
  namespaced: true,
  state: {
    isEquipmentOpen: false,
    isAbilitiesOpen: false,
    isInventoryOpen: false,
    isMapOpen: false,
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
    toggleAbilities(state) {
      console.log('test');
      state.isAbilitiesOpen = !state.isAbilitiesOpen;
    },
    toggleInventory(state) {
      state.isInventoryOpen = !state.isInventoryOpen;
    },
    toggleMap(state) {
      state.isMapOpen = !state.isMapOpen;
    },
  },
};
