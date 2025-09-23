import { defineStore } from "pinia";

export const useDialogsStore = defineStore("dialogs", {
  state: () => ({
    isCharacterOpen: false,
    isAbilitiesOpen: false,
    isSettingsOpen: false,
  }),
  actions: {
    closeCharacter() {
      this.isCharacterOpen = false;
    },
    closeAbilities() {
      this.isAbilitiesOpen = false;
    },
    closeSettings() {
      this.isSettingsOpen = false;
    },
    toggleCharacter() {
      this.isCharacterOpen = !this.isCharacterOpen;
    },
    toggleAbilities() {
      this.isAbilitiesOpen = !this.isAbilitiesOpen;
    },
    toggleSettings() {
      this.isSettingsOpen = !this.isSettingsOpen;
    },
  },
});
