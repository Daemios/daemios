<template>
  <div
    class="debug-panel"
    style="
      width: 260px;
      background: rgba(0, 0, 0, 0.6);
      color: #fff;
      border-radius: 8px;
      padding: 12px;
      font-family: var(--v-font-family, Arial, sans-serif);
    "
  >
    <h3 style="margin: 0 0 8px 0; font-size: 14px">World Debug Panel</h3>

    <div
      class="controls"
      style="display: flex; flex-direction: column; gap: 8px"
    >
      <label style="display: flex; align-items: center; gap: 8px">
        <input v-model="state.clutter" type="checkbox" />
        Show clutter
      </label>

      <label style="display: flex; align-items: center; gap: 8px">
        <input v-model="state.shadows" type="checkbox" />
        Shadows
      </label>

      <label style="display: flex; align-items: center; gap: 8px">
        <input v-model="state.water" type="checkbox" />
        Water
      </label>

      <label style="display: flex; align-items: center; gap: 8px">
        <input v-model="state.chunkColors" type="checkbox" />
        Chunk colors
      </label>

      <label style="display: flex; align-items: center; gap: 8px">
        <input v-model="state.directions" type="checkbox" />
        Directions
      </label>

      <div
        style="
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          padding-top: 8px;
        "
      >
        <div style="font-size: 12px; margin-bottom: 6px">Map size presets</div>

        <label style="display: flex; align-items: center; gap: 8px">
          <input v-model="state.sizePreset" type="radio" value="small" />
          Small
        </label>

        <label style="display: flex; align-items: center; gap: 8px">
          <input v-model="state.sizePreset" type="radio" value="medium" />
          Medium
        </label>

        <label style="display: flex; align-items: center; gap: 8px">
          <input v-model="state.sizePreset" type="radio" value="large" />
          Large
        </label>

        <label style="display: flex; align-items: center; gap: 8px">
          <input v-model="state.sizePreset" type="radio" value="custom" />
          Custom
        </label>

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
          />
          <div style="font-size: 12px; color: rgba(255, 255, 255, 0.7)">
            radius
          </div>
        </div>
      </div>

      <div
        style="display: flex; justify-content: space-between; margin-top: 8px"
      >
        <button
          style="
            background: #2b8;
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
export default {
  name: "DebugPanel",
  props: {
    value: { type: Object, default: () => ({}) },
  },
  emits: ["apply"],
  data() {
    return {
      state: {
        clutter: this.value.clutter ?? true,
        shadows: this.value.shadows ?? true,
        water: this.value.water ?? true,
        chunkColors: this.value.chunkColors ?? false,
        directions: this.value.directions ?? false,
        sizePreset: this.value.sizePreset ?? "medium",
        customSize: this.value.customSize ?? 48,
      },
    };
  },
  methods: {
    apply() {
      // Resolve preset to numeric radius
      let radius;
      if (this.state.sizePreset === "small") radius = 20;
      else if (this.state.sizePreset === "medium") radius = 48;
      else if (this.state.sizePreset === "large") radius = 96;
      else radius = Number(this.state.customSize) || 48;

      this.$emit("apply", {
        clutter: !!this.state.clutter,
        shadows: !!this.state.shadows,
        water: !!this.state.water,
        chunkColors: !!this.state.chunkColors,
        directions: !!this.state.directions,
        sizePreset: this.state.sizePreset,
        mapRadius: radius,
      });
    },
    reset() {
      this.state = {
        clutter: true,
        shadows: true,
        water: true,
        chunkColors: false,
        directions: false,
        sizePreset: "medium",
        customSize: 48,
      };
      this.apply();
    },
  },
};
</script>
