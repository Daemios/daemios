// Settings Vuex module with localStorage persistence

const STORAGE_KEY = 'daemios.settings';

function loadFromStorage() {
  try {
    const raw = window && window.localStorage ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return (parsed && typeof parsed === 'object') ? parsed : {};
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[settings] Failed to load from localStorage:', e);
    return {};
  }
}

// Basic deep get/set helpers using dot-paths
function getAtPath(obj, path, defVal) {
  if (!path) return obj;
  const parts = Array.isArray(path) ? path : String(path).split('.');
  let cur = obj;
  for (let i = 0; i < parts.length; i += 1) {
    if (cur == null) return defVal;
    cur = cur[parts[i]];
  }
  return cur === undefined ? defVal : cur;
}

function setAtPath(obj, path, value) {
  const parts = Array.isArray(path) ? path : String(path).split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const k = parts[i];
    if (typeof cur[k] !== 'object' || cur[k] === null) {
      // eslint-disable-next-line no-param-reassign
      cur[k] = {};
    }
    cur = cur[k];
  }
  // eslint-disable-next-line no-param-reassign
  cur[parts[parts.length - 1]] = value;
}

function deepMergeObjects(a, b) {
  const out = (a && typeof a === 'object' && !Array.isArray(a)) ? { ...a } : {};
  if (b && typeof b === 'object' && !Array.isArray(b)) {
    Object.keys(b).forEach((k) => {
      const val = b[k];
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        out[k] = deepMergeObjects(out[k], val);
      } else {
        out[k] = val;
      }
    });
  }
  return out;
}

const state = () => ({
  // Entire settings tree; organized under headers, e.g., { worldMap: { ... }, audio: { ... } }
  all: loadFromStorage(),
});

const getters = {
  // Retrieve a setting by dot-path; when no path is provided, returns full tree
  get: (st) => (path, defVal = undefined) => getAtPath(st.all, path, defVal),
  all: (st) => st.all,
};

const mutations = {
  // Replace entire settings tree (use with care)
  replaceAll(st, next) {
  // eslint-disable-next-line no-param-reassign
  st.all = (next && typeof next === 'object') ? next : {};
  },
  // Set value at dot-path
  setAtPath(st, { path, value }) {
    setAtPath(st.all, path, value);
  },
  // Merge object at path (deep)
  mergeAtPath(st, { path, value }) {
    if (!path || value == null) return;
    const current = getAtPath(st.all, path, {});
    const base = (current && typeof current === 'object') ? { ...current } : {};
  const merged = deepMergeObjects(base, value);
    setAtPath(st.all, path, merged);
  },
  // Remove a key at path
  deleteAtPath(st, { path }) {
    if (!path) return;
    const parts = Array.isArray(path) ? path : String(path).split('.');
    const last = parts.pop();
    const parent = getAtPath(st.all, parts, undefined);
    if (parent && Object.prototype.hasOwnProperty.call(parent, last)) {
      delete parent[last];
    }
  },
};

export default {
  namespaced: true,
  state,
  getters,
  mutations,
};
