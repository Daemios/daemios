import { defineStore } from "pinia";

const STORAGE_KEY = "daemios.settings";

function loadFromStorage() {
  try {
    const raw =
      typeof window !== "undefined" && window.localStorage
        ? window.localStorage.getItem(STORAGE_KEY)
        : null;
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (e) {
    console.warn("[settings] Failed to load from localStorage:", e); // eslint-disable-line no-console
    return {};
  }
}

function getAtPath(obj, path, defVal) {
  if (!path) return obj;
  const parts = Array.isArray(path) ? path : String(path).split(".");
  let cur = obj;
  for (let i = 0; i < parts.length; i += 1) {
    if (cur == null) return defVal;
    cur = cur[parts[i]];
  }
  return cur === undefined ? defVal : cur;
}

function setAtPath(obj, path, value) {
  const parts = Array.isArray(path) ? path : String(path).split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const k = parts[i];
    if (typeof cur[k] !== "object" || cur[k] === null) cur[k] = {};
    cur = cur[k];
  }
  cur[parts[parts.length - 1]] = value; // eslint-disable-line no-param-reassign
}

function deepMergeObjects(a, b) {
  const out = a && typeof a === "object" && !Array.isArray(a) ? { ...a } : {};
  if (b && typeof b === "object" && !Array.isArray(b)) {
    Object.keys(b).forEach((k) => {
      const val = b[k];
      if (val && typeof val === "object" && !Array.isArray(val)) {
        out[k] = deepMergeObjects(out[k], val);
      } else {
        out[k] = val;
      }
    });
  }
  return out;
}

export const useSettingsStore = defineStore("settings", {
  state: () => ({
    all: loadFromStorage(),
  }),
  getters: {
    get:
      (state) =>
      (path, defVal = undefined) =>
        getAtPath(state.all, path, defVal),
  },
  actions: {
    replaceAll(next) {
      this.all = next && typeof next === "object" ? next : {};
      this.persist();
    },
    setAtPath({ path, value }) {
      setAtPath(this.all, path, value);
      this.persist();
    },
    mergeAtPath({ path, value }) {
      if (!path || value == null) return;
      const current = getAtPath(this.all, path, {});
      const base = current && typeof current === "object" ? { ...current } : {};
      const merged = deepMergeObjects(base, value);
      setAtPath(this.all, path, merged);
      this.persist();
    },
    deleteAtPath({ path }) {
      if (!path) return;
      const parts = Array.isArray(path) ? path : String(path).split(".");
      const last = parts.pop();
      const parent = getAtPath(this.all, parts, undefined);
      if (parent && Object.prototype.hasOwnProperty.call(parent, last)) {
        delete parent[last];
        this.persist();
      }
    },
    persist() {
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.all));
        }
      } catch (e) {
        console.warn("[settings] Failed to persist to localStorage:", e); // eslint-disable-line no-console
      }
    },
  },
});
