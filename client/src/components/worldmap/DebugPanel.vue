<template>
  <div
    class="debug-panel position-absolute text-white text-caption"
    style="
      left: 12px;
      bottom: 12px;
      z-index: 2200;
      background: rgba(0, 0, 0, 0.55);
      min-width: 220px;
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
        align-items: center;
        justify-content: space-between;
        margin-bottom: 6px;
      "
    >
      <div style="font-size: 13px; font-weight: 600">World Debug</div>
      <div style="font-size: 11px; opacity: 0.8">Debug tools</div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px 10px">
      <label class="d-flex align-center cursor-pointer" style="gap: 6px">
        <input
          v-model="state.clutter"
          type="checkbox"
          @change="applyImmediate"
        />
        Clutter
      </label>

      <label class="d-flex align-center cursor-pointer" style="gap: 6px">
        <input
          v-model="state.shadows"
          type="checkbox"
          @change="applyImmediate"
        />
        Shadows
      </label>

      <label class="d-flex align-center cursor-pointer" style="gap: 6px">
        <input v-model="state.water" type="checkbox" @change="applyImmediate" />
        Water
      </label>

      <label class="d-flex align-center cursor-pointer" style="gap: 6px">
        <input
          v-model="state.chunkColors"
          type="checkbox"
          @change="applyImmediate"
        />
        Chunk colors
      </label>

      <!-- showChunkBorders option removed -->

      <label class="d-flex align-center cursor-pointer" style="gap: 6px">
        <input
          v-model="state.directions"
          type="checkbox"
          @change="applyImmediate"
        />
        Directions
      </label>
    </div>

    <div
      style="
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        padding-top: 8px;
        margin-top: 8px;
      "
    >
      <div style="font-size: 12px; margin-bottom: 6px">Map size presets</div>

      <div style="display: flex; gap: 6px; flex-wrap: wrap">
        <button
          title="Small"
          :style="presetStyle(state.sizePreset === 'small')"
          @click="
            (e) => {
              setPreset('small');
              applyImmediate();
            }
          "
        >
          Small
        </button>

        <button
          title="Medium"
          :style="presetStyle(state.sizePreset === 'medium')"
          @click="
            (e) => {
              setPreset('medium');
              applyImmediate();
            }
          "
        >
          Medium
        </button>

        <button
          title="Large"
          :style="presetStyle(state.sizePreset === 'large')"
          @click="
            (e) => {
              setPreset('large');
              applyImmediate();
            }
          "
        >
          Large
        </button>

        <button
          title="Custom"
          :style="presetStyle(state.sizePreset === 'custom')"
          @click="
            (e) => {
              setPreset('custom');
              applyImmediate();
            }
          "
        >
          Custom
        </button>
      </div>

      <div
        v-if="state.sizePreset === 'custom'"
        style="display: flex; gap: 8px; align-items: center; margin-top: 6px"
      >
        <input
          v-model.number="state.customSize"
          type="number"
          min="1"
          style="
            width: 100px;
            padding: 4px;
            border-radius: 4px;
            border: 1px solid rgba(255, 255, 255, 0.12);
            background: transparent;
            color: inherit;
          "
          @input="applyImmediate"
        />
        <div style="font-size: 12px; color: rgba(255, 255, 255, 0.7)">
          radius
        </div>
      </div>

      <div
        style="display: flex; justify-content: space-between; margin-top: 8px"
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
        style="
          font-size: 11px;
          color: rgba(255, 255, 255, 0.6);
          margin-top: 8px;
        "
      >
        Note: some toggles are UI-only placeholders until wiring is implemented.
      </div>
    </div>
  </div>
</template>

<script>
import { useSettingsStore } from "@/stores/settingsStore";

export default {
  name: "DebugPanel",
  props: {
    value: { type: Object, default: () => ({}) },
  },
  emits: ["apply"],
  data() {
    // load saved settings if present
    const settings = useSettingsStore();
    const saved =
      settings && typeof settings.get === "function"
        ? settings.get("worldMap", {})
        : {};
    const savedFeatures = saved.features || {};
    const savedGeneration = saved.generation || {};

    return {
      settings,
      state: {
        clutter: this.value.clutter ?? savedFeatures.clutter ?? true,
        shadows: this.value.shadows ?? savedFeatures.shadows ?? true,
        water: this.value.water ?? savedFeatures.water ?? true,
        chunkColors:
          this.value.chunkColors ?? savedFeatures.chunkColors ?? false,
        directions: this.value.directions ?? savedFeatures.directions ?? false,
        sizePreset:
          this.value.sizePreset ?? savedGeneration.sizePreset ?? "medium",
        customSize: this.value.customSize ?? savedGeneration.customSize ?? 48,
      },
    };
  },
  methods: {
    apply() {
      let radius;
      if (this.state.sizePreset === "small") radius = 1;
      else if (this.state.sizePreset === "medium") radius = 5;
      else if (this.state.sizePreset === "large") radius = 9;
      else radius = Number(this.state.customSize) || 1;

      const payload = {
        clutter: !!this.state.clutter,
        shadows: !!this.state.shadows,
        water: !!this.state.water,
        chunkColors: !!this.state.chunkColors,
        directions: !!this.state.directions,
        sizePreset: this.state.sizePreset,
        mapRadius: radius,
      };

      // persist to settings store using same field names as existing code
      try {
        if (this.settings && typeof this.settings.mergeAtPath === "function") {
          this.settings.mergeAtPath({
            path: "worldMap",
            value: {
              features: {
                clutter: !!this.state.clutter,
                shadows: !!this.state.shadows,
                water: !!this.state.water,
                chunkColors: !!this.state.chunkColors,
                // showChunkBorders option removed
                directions: !!this.state.directions,
              },
              generation: {
                // store radius under generation.radius to match useWorldMap
                radius: radius,
                sizePreset: this.state.sizePreset,
                customSize: this.state.customSize,
              },
            },
          });
        }
      } catch (e) {
        // ignore persistence errors
      }

      this.$emit("apply", payload);
    },
    applyImmediate() {
      // reuse apply() behavior but avoid blocking UI; emit and persist immediately
      try {
        this.apply();
      } catch (e) {
        // swallow errors
      }
    },
    reset() {
      this.state = {
        clutter: true,
        shadows: true,
        water: true,
        chunkColors: false,
        directions: false,
        sizePreset: "medium",
        customSize: 1,
      };
      this.apply();
    },
    setPreset(p) {
      this.state.sizePreset = p;
    },
    presetStyle(active) {
      return active
        ? "background:#fff;color:#012;border:none;padding:6px 8px;border-radius:4px;font-weight:600"
        : "background:transparent;color:inherit;border:1px solid rgba(255,255,255,0.08);padding:6px 8px;border-radius:4px";
    },
  },
};
</script>
