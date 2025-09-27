// Centralized keybind actions
// This module exports a factory that accepts the app stores and returns a map
// of actionId -> function. Keep the action implementations here so the keybind
// registration code doesn't need to know about stores directly.

export function createKeybindActions({ dialogs, chatStore, userStore }) {
  return {
    openInventory() {
      dialogs.toggleInventory();
    },
    openCharacter() {
      dialogs.toggleCharacter();
    },
    openAbilities() {
      dialogs.toggleAbilities();
    },
    toggleMap() {
      // Placeholder: replace with actual map toggle if available
      dialogs.toggleSettings();
    },
    closeOrSettings() {
      if (
        dialogs.isEquipmentOpen ||
        dialogs.isInventoryOpen ||
        dialogs.isAbilitiesOpen ||
        dialogs.isSettingsOpen
      ) {
        dialogs.closeEquipment();
        dialogs.closeInventory();
        dialogs.closeAbilities();
        dialogs.closeSettings();
      } else {
        dialogs.toggleSettings();
      }
    },
    // Example action hooks that use other stores
    focusChat() {
      // example: open chat input
      chatStore.open && chatStore.open();
    },
    openUserProfile() {
      userStore.openProfile && userStore.openProfile();
    },
  };
}

export default createKeybindActions;
