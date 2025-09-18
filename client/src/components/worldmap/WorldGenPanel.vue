<template>
  <div
    class="worldgen-panel position-absolute text-white text-caption"
    style="
      left: 12px;
      bottom: 12px;
      z-index: 2200;
      background: rgba(0,0,0,0.55);
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
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px">
      <div style="font-size:13px; font-weight:600">
        World Generation
      </div>
      <div style="font-size:11px; opacity:0.8">
        Layers
      </div>
    </div>

    <div
      style="display:grid; grid-template-columns: 1fr; gap:8px;"
    >
      <label
        class="d-flex align-center cursor-pointer"
        style="gap:8px"
      >
        <input
          v-model="layers.layer0"
          type="checkbox"
          @change="applyImmediate"
        >
  Creative Constraints & Palette
      </label>

      <label
        class="d-flex align-center cursor-pointer"
        style="gap:8px"
      >
        <input
          v-model="layers.layer1"
          type="checkbox"
          @change="applyImmediate"
        >
  Continents & Oceans
      </label>

  <!--     seaLevel is configured in shared/lib/worldgen/config.js and is not editable at runtime -->

      <label
        class="d-flex align-center cursor-pointer"
        style="gap:8px"
      >
        <input
          v-model="layers.layer3"
          type="checkbox"
          @change="applyImmediate"
        >
  Biome Blending & Palette
      </label>

      <label
        class="d-flex align-center cursor-pointer"
        style="gap:8px"
      >
        <input
          v-model="layers.layer3_5"
          type="checkbox"
          @change="applyImmediate"
        >
  Ground Clutter System
      </label>

      <label
        class="d-flex align-center cursor-pointer"
        style="gap:8px"
      >
        <input
          v-model="layers.layer4"
          type="checkbox"
          @change="applyImmediate"
        >
  Special & Rare Regions
      </label>
    </div>

    <div style="border-top:1px solid rgba(255,255,255,0.08); padding-top:8px; margin-top:10px; display:flex; justify-content:space-between;">
      <button
        style="background: rgba(43, 136, 136, 0.95); border: none; padding: 6px 10px; border-radius: 4px; color: #012; font-weight: 600;"
        @click="apply"
      >
        Apply
      </button>
      <button
        style="background: transparent; border: 1px solid rgba(255,255,255,0.12); padding: 6px 10px; border-radius: 4px; color: inherit;"
        @click="reset"
      >
        Reset
      </button>
    </div>

    <div style="font-size:11px; color:rgba(255,255,255,0.6); margin-top:8px">
      Changes apply immediately; disable layers to preview intermediate generation stages.
    </div>
  </div>
</template>

<script>
import { useSettingsStore } from '@/stores/settingsStore';

export default {
  name: 'WorldGenPanel',
  emits: ['apply'],
  data() {
    const settings = useSettingsStore();
    const saved = settings && typeof settings.get === 'function' ? settings.get('worldMap', {}) : {};
    const savedLayers = saved.generation && saved.generation.layers ? saved.generation.layers : {};
    return {
      settings,
      layers: {
        layer0: typeof savedLayers.layer0 === 'boolean' ? savedLayers.layer0 : true,
        layer1: typeof savedLayers.layer1 === 'boolean' ? savedLayers.layer1 : true,
        layer3: typeof savedLayers.layer3 === 'boolean' ? savedLayers.layer3 : true,
        layer3_5: typeof savedLayers.layer3_5 === 'boolean' ? savedLayers.layer3_5 : true,
        layer4: typeof savedLayers.layer4 === 'boolean' ? savedLayers.layer4 : true,
      }
    };
  },
  methods: {
    apply() {
      const payload = { layers: { ...this.layers } };
      try {
        if (this.settings && typeof this.settings.mergeAtPath === 'function') {
          this.settings.mergeAtPath({ path: 'worldMap', value: { generation: { layers: { ...this.layers } } } });
        }
      } catch (e) {
        // ignore
      }
      this.$emit('apply', payload);
    },
    applyImmediate() {
      try {
        this.apply();
      } catch (e) {
        // ignore failures applying immediately
      }
    },
    reset() {
      this.layers = { layer0: true, layer1: true, layer3: true, layer3_5: true, layer4: true };
      this.apply();
    }
  }
};
</script>
