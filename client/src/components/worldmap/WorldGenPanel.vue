<template>
  <div
    class="worldgen-panel position-absolute text-white text-caption"
    style="
      left: 12px;
      bottom: 12px;
      background: rgba(0, 0, 0, 0.55);
      min-width: 260px;
      border-radius: 8px;
      padding: 10px;
      line-height: 1.2;
    "
    @pointerdown.stop
    @pointermove.stop
    @pointerup.stop
    @click.stop
    @wheel.stop.prevent
    @contextmenu.stop.prevent
  >
    <div
      style="
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      "
    >
      <div style="font-size: 13px; font-weight: 600">
        World Generation
      </div>
      <div style="font-size: 11px; opacity: 0.8">
        Layers
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr; gap: 8px">
      <label
        class="d-flex align-center cursor-pointer"
        style="gap: 8px"
      >
        <input
          v-model="layers.palette"
          type="checkbox"
          @change="applyImmediate"
        >
        Palette & Creative Constraints
      </label>

      <label
        class="d-flex align-center cursor-pointer"
        style="gap: 8px"
      >
        <input
          v-model="layers.continents"
          type="checkbox"
          @change="applyImmediate"
        >
        Continents & Plates
      </label>

      <label
        class="d-flex align-center cursor-pointer"
        style="gap: 8px"
      >
        <input
          v-model="layers.plates_and_mountains"
          type="checkbox"
          @change="applyImmediate"
        >
        Plates & Mountains (mesoscale)
      </label>

      <!--     seaLevel is configured in shared/lib/worldgen/config.js and is not editable at runtime -->

      <label
        class="d-flex align-center cursor-pointer"
        style="gap: 8px"
      >
        <input
          v-model="layers.biomes"
          type="checkbox"
          @change="applyImmediate"
        >
        Biome Selection (semantic)
      </label>

      <label
        class="d-flex align-center cursor-pointer"
        style="gap: 8px"
      >
        <input
          v-model="layers.variation"
          type="checkbox"
          @change="applyImmediate"
        >
        Microvariation (fine-grain noise)
      </label>

      <label
        class="d-flex align-center cursor-pointer"
        style="gap: 8px"
      >
        <input
          v-model="layers.clutter"
          type="checkbox"
          @change="applyImmediate"
        >
        Clutter Placement
      </label>

      <label
        class="d-flex align-center cursor-pointer"
        style="gap: 8px"
      >
        <input
          v-model="layers.specials"
          type="checkbox"
          @change="applyImmediate"
        >
        Special Regions
      </label>
    </div>

    <div
      style="
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        padding-top: 8px;
        margin-top: 10px;
        display: flex;
        justify-content: space-between;
      "
    >
      <button
        style="
          background: rgba(43, 136, 136, 0.95);
          border: none;
          padding: 6px 10px;
          border-radius: 4px;
          color: #012;
          font-weight: 600;
        "
        @click="apply"
      >
        Apply
      </button>
      <button
        style="
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.12);
          padding: 6px 10px;
          border-radius: 4px;
          color: inherit;
        "
        @click="reset"
      >
        Reset
      </button>
    </div>

    <div
      style="font-size: 11px; color: rgba(255, 255, 255, 0.6); margin-top: 8px"
    >
      Changes apply immediately; disable layers to preview intermediate
      generation stages.
    </div>
  </div>
</template>

<script>
import { useSettingsStore } from "@/stores/settingsStore";

export default {
  name: "WorldGenPanel",
  emits: ["apply"],
  data() {
    const settings = useSettingsStore();
    const saved =
      settings && typeof settings.get === "function"
        ? settings.get("worldMap", {})
        : {};
    const savedLayers =
      saved.generation && saved.generation.layers
        ? saved.generation.layers
        : {};
    // Support both legacy layerN keys and canonical keys in saved settings
    const pick = (kCanonical, kLegacy, def = true) => {
      if (typeof savedLayers[kCanonical] === "boolean")
        return savedLayers[kCanonical];
      if (typeof savedLayers[kLegacy] === "boolean")
        return savedLayers[kLegacy];
      return def;
    };
    return {
      settings,
      layers: {
        palette: pick("palette", "layer0", true),
        continents: pick("continents", "layer1", true),
        plates_and_mountains: pick("plates_and_mountains", "layer2", true),
        biomes: pick("biomes", "layer3", true),
        variation: pick("variation", "layer3_25", true),
        clutter: pick("clutter", "layer3_5", true),
        specials: pick("specials", "layer4", true),
      },
    };
  },
  methods: {
    apply() {
      const payload = { layers: { ...this.layers } };
      try {
        if (this.settings && typeof this.settings.mergeAtPath === "function") {
          // Persist canonical keys
          this.settings.mergeAtPath({
            path: "worldMap",
            value: { generation: { layers: { ...this.layers } } },
          });
        }
      } catch (e) {
        // ignore
      }
      this.$emit("apply", payload);
    },
    applyImmediate() {
      try {
        this.apply();
      } catch (e) {
        // ignore failures applying immediately
      }
    },
    reset() {
      this.layers = {
        palette: true,
        continents: true,
        plates_and_mountains: true,
        biomes: true,
        variation: true,
        clutter: true,
        specials: true,
      };
      this.apply();
    },
  },
};
</script>
