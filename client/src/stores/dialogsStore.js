import { defineStore } from "pinia";

export const useDialogsStore = defineStore("dialogs", {
  state: () => ({
    isEquipmentOpen: false,
    isInventoryOpen: false,
    isAbilitiesOpen: false,
  isSettingsOpen: false,
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
    closeSettings() {
      this.isSettingsOpen = false;
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
    toggleSettings() {
      this.isSettingsOpen = !this.isSettingsOpen;
    },
  },
});
