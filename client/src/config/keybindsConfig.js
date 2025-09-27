/*
  Keybinds configuration
  Each entry defines: id, label, defaultCombo (array of codes), and an optional handler key
  The app will register these actions and assign handlers at runtime.
*/

export const keybindsConfig = [
  { id: "openCharacter", label: "Open Character", defaultCombo: ["KeyC"] },
  { id: "openInventory", label: "Open Inventory", defaultCombo: ["KeyI"] },
  { id: "openAbilities", label: "Open Abilities", defaultCombo: ["KeyA"] },
  { id: "closeOrSettings", label: "Close or Settings", defaultCombo: ["Escape"] },
];

export default keybindsConfig;
