/*
  Keybinds module

  Responsibilities:
  - Register actions and their handlers
  - Listen for key combinations (modifier + keys) and fire actions
  - Provide capture mode to record a combo for a single action
  - Persist user bindings to localStorage and merge with defaults

  Combo format: array of strings representing event.code or normalized names.
    e.g. ["ControlLeft","KeyM"] or ["ShiftLeft","KeyA"]

  Stored format in localStorage: object mapping actionId -> combo array
*/

const STORAGE_KEY = "daemios:keybinds:v1";

function normalizeEvent(e) {
  // Use code when possible to avoid layout differences; fall back to key
  return e.code || (e.key && e.key.length === 1 ? `Key${e.key.toUpperCase()}` : e.key);
}

function arrayEqual(a, b) {
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

export default function createKeybinds() {
  const actions = new Map(); // actionId -> { handler, label }
  let persisted = {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) persisted = JSON.parse(raw) || {};
  } catch (err) {
    console.warn("Failed to read keybinds from localStorage", err);
  }

  function normalizeStoredKey(k) {
    if (!k || typeof k !== 'string') return k;
    // If already a code like 'KeyA' or 'Escape' or modifier, leave as-is
    if (/^Key[A-Z]$/.test(k) || k.length > 1) return k;
    // Single-letter legacy value -> convert to Key<UPPER>
    if (/^[a-zA-Z]$/.test(k)) return `Key${k.toUpperCase()}`;
    return k;
  }

  // Normalize persisted combos (support older single-letter formats)
  for (const pid of Object.keys(persisted)) {
    const combo = persisted[pid];
    if (Array.isArray(combo)) {
      persisted[pid] = combo.map(normalizeStoredKey);
    }
  }

  let captureAction = null;
  let captureResolve = null;

  // current down set to handle combos
  const down = new Set();

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
    } catch (err) {
      console.warn("Failed to save keybinds", err);
    }
  }

  function registerAction(actionId, { handler, label, defaultCombo } = {}) {
    actions.set(actionId, { handler, label, defaultCombo });
  }

  function getCombo(actionId) {
    if (persisted[actionId]) return persisted[actionId];
    const entry = actions.get(actionId);
    if (entry && entry.defaultCombo) return entry.defaultCombo;
    return null;
  }

  function setCombo(actionId, combo) {
    if (!combo) {
      delete persisted[actionId];
    } else {
      // store a copy
      persisted[actionId] = Array.from(combo);
    }
    save();
  }

  function resetToDefaults() {
    persisted = {};
    for (const [id, entry] of actions.entries()) {
      if (entry.defaultCombo) persisted[id] = Array.from(entry.defaultCombo);
    }
    save();
  }

  function listBindings() {
    const out = {};
    for (const [id] of actions.entries()) {
      out[id] = getCombo(id);
    }
    return out;
  }

  function tryFireForDownSet() {
    // We will check each registered action and fire the one matching the down set
    const current = Array.from(down).sort();
    for (const [id, entry] of actions.entries()) {
      const combo = getCombo(id);
      if (!combo) continue;
      const sorted = Array.from(combo).sort();
      if (arrayEqual(sorted, current)) {
        try {
          entry.handler && entry.handler();
        } catch (err) {
          console.error("Keybind handler for", id, "errored", err);
        }
        // If one fired, don't fire others (simple priority)
        return;
      }
    }
  }

  function onKeyDown(e) {
    // If capturing, resolve with the combo (unique set of codes with order: modifiers first then keys)
    const code = normalizeEvent(e);
    if (!code) return;
    down.add(code);

    if (captureAction) {
      // build combo: prefer modifiers first
      const mods = ["ControlLeft", "ControlRight", "ShiftLeft", "ShiftRight", "AltLeft", "AltRight", "MetaLeft", "MetaRight"].filter(m => down.has(m));
      const others = Array.from(down).filter(d => !mods.includes(d));
      const combo = mods.concat(others);
      const action = captureAction;
      const resolve = captureResolve;
      captureAction = null;
      captureResolve = null;
      e.preventDefault();
      setCombo(action, combo);
      resolve && resolve(combo);
      return;
    }

    // Try to fire matching action
    tryFireForDownSet();
  }

  function onKeyUp(e) {
    const code = normalizeEvent(e);
    if (!code) return;
    down.delete(code);
  }

  function startCapture(actionId) {
    return new Promise((resolve) => {
      captureAction = actionId;
      captureResolve = resolve;
    });
  }

  function getDisplay(actionId) {
    const combo = getCombo(actionId);
    if (!combo) return "";
    return combo.map(c => c.replace(/^Key/, '')).join(' + ');
  }

  function start() {
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
  }

  function stop() {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
  }

  function importBindings(obj) {
    persisted = Object.assign({}, obj || {});
    // normalize imported combos too
    for (const pid of Object.keys(persisted)) {
      const combo = persisted[pid];
      if (Array.isArray(combo)) persisted[pid] = combo.map(normalizeStoredKey);
    }
    save();
  }

  return {
    registerAction,
    getCombo,
    setCombo,
    resetToDefaults,
    listBindings,
    startCapture,
    getDisplay,
    start,
    stop,
    importBindings,
    STORAGE_KEY,
  };
}

// Export a singleton instance for convenience
export const keybinds = createKeybinds();
