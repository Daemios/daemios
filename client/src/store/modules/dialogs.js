export default {
  namespaced: true,
  state: {
    isEquipmentOpen: false,
    isInventoryOpen: false,
    isAbilitiesOpen: false,
    isOptionsOpen: false,
  },
  mutations: {
    // Closers
    closeEquipment(state) {
      state.isEquipmentOpen = false;
    },
    closeInventory(state) {
      state.isInventoryOpen = false;
    },
    closeAbilities(state) {
      state.isAbilitiesOpen = false;
    },
    closeOptions(state) {
      state.isOptionsOpen = false;
    },

    // Toggles
    toggleEquipment(state) {
      state.isEquipmentOpen = !state.isEquipmentOpen;
    },
    toggleAbilities(state) {
      state.isAbilitiesOpen = !state.isAbilitiesOpen;
    },
    toggleInventory(state) {
      state.isInventoryOpen = !state.isInventoryOpen;
    },
    toggleOptions(state) {
      state.isOptionsOpen = !state.isOptionsOpen;
    }
  },
};
