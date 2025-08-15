import { defineStore } from "pinia";

export const useDialogsStore = defineStore("dialogs", {
  state: () => ({
    isEquipmentOpen: false,
    isInventoryOpen: false,
    isAbilitiesOpen: false,
    isOptionsOpen: false,
  }),
  actions: {
    closeEquipment() {
      this.isEquipmentOpen = false;
    },
    closeInventory() {
      this.isInventoryOpen = false;
    },
    closeAbilities() {
      this.isAbilitiesOpen = false;
    },
    closeOptions() {
      this.isOptionsOpen = false;
    },
    toggleEquipment() {
      this.isEquipmentOpen = !this.isEquipmentOpen;
    },
    toggleAbilities() {
      this.isAbilitiesOpen = !this.isAbilitiesOpen;
    },
    toggleInventory() {
      this.isInventoryOpen = !this.isInventoryOpen;
    },
    toggleOptions() {
      this.isOptionsOpen = !this.isOptionsOpen;
    },
  },
});
