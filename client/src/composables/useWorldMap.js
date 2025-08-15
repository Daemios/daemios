import { reactive, toRefs } from "vue";
import { useSettingsStore } from "@/stores/settingsStore";
import { useWorldStore } from "@/stores/worldStore";
import api from "@/utils/api";

// Lightweight composable to centralize world map UI state and persistence.
export default function useWorldMap() {
  const settings = useSettingsStore();
  const worldStore = useWorldStore();

  const state = reactive({
    worldSeed: 1337,
    debug: { show: true },
    features: {
      shadows: true,
      water: true,
      chunkColors: true,
      clutter: true,
    },
    radialFade: {
      enabled: false,
      color: 0xf3eed9,
      radius: 0,
      width: 5.0,
      minHeightScale: 0.05,
    },
    generation: {
      version: null,
      scale: 1.0,
      radius: 5,
      tuning: {},
    },
    selectedQR: { q: null, r: null },
    locations: [],
  });

  // Load persisted settings if present
  try {
    const saved = settings.get("worldMap", null);
    if (saved && typeof saved === "object") {
      if (saved.debug && typeof saved.debug === "object")
        Object.assign(state.debug, saved.debug);
      if (saved.features && typeof saved.features === "object")
        Object.assign(state.features, saved.features);
      if (saved.radialFade && typeof saved.radialFade === "object")
        Object.assign(state.radialFade, saved.radialFade);
      if (saved.generation && typeof saved.generation === "object")
        Object.assign(state.generation, saved.generation);
      if (typeof saved.worldSeed === "number")
        state.worldSeed = saved.worldSeed;
    }
  } catch (e) {
    // noop
  }

  function persist() {
    try {
      if (settings && settings.mergeAtPath) {
        settings.mergeAtPath({
          path: "worldMap",
          value: {
            debug: state.debug,
            features: state.features,
            radialFade: state.radialFade,
            generation: state.generation,
            worldSeed: state.worldSeed,
          },
        });
      }
    } catch (e) {
      // noop
    }
  }

  async function fetchLocations() {
    try {
      const locs = await api.get("world/locations");
      state.locations = Array.isArray(locs) ? locs : [];
      return state.locations;
    } catch (e) {
      console.error("useWorldMap: failed to fetch locations", e);
      state.locations = [];
      return state.locations;
    }
  }

  async function createTown() {
    if (!worldStore || !worldStore.createTown) return null;
    try {
      await worldStore.createTown();
      return worldStore.towns || [];
    } catch (e) {
      console.error("useWorldMap: createTown failed", e);
      return null;
    }
  }

  function selectTile(q, r) {
    state.selectedQR.q = q;
    state.selectedQR.r = r;
    try {
      api.post("world/move", { q, r });
    } catch (e) {
      /* noop */
    }
  }

  function setWorldSeed(seed) {
    if (typeof seed === "number") {
      state.worldSeed = seed;
      persist();
    }
  }

  function toggleFeature(key, val) {
    if (key in state.features) {
      state.features[key] = val === undefined ? !state.features[key] : !!val;
      persist();
    }
  }

  return {
    ...toRefs(state),
    fetchLocations,
    createTown,
    selectTile,
    setWorldSeed,
    toggleFeature,
    persist,
  };
}
