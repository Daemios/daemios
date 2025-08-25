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
      <div style="font-size:13px; font-weight:600">World Generation</div>
      <div style="font-size:11px; opacity:0.8">Layers</div>
    </div>

    <div style="display:grid; grid-template-columns: 1fr; gap:8px;">
      <label class="d-flex align-center cursor-pointer" style="gap:8px">
        <input type="checkbox" v-model="layers.layer0" @change="applyImmediate" />
        Layer 0 — Creative Constraints & Palette
      </label>

      <label class="d-flex align-center cursor-pointer" style="gap:8px">
        <input type="checkbox" v-model="layers.layer1" @change="applyImmediate" />
        Layer 1 — Continents & Oceans
      </label>

      <label class="d-flex align-center cursor-pointer" style="gap:8px">
        <input type="checkbox" v-model="layers.layer2" @change="applyImmediate" />
        Layer 2 — Mesoscale & Regional Identity
      </label>

      <label class="d-flex align-center cursor-pointer" style="gap:8px">
        <input type="checkbox" v-model="layers.layer3" @change="applyImmediate" />
        Layer 3 — Biome Blending, Palette & Clutter Rules
      </label>

      <label class="d-flex align-center cursor-pointer" style="gap:8px">
        <input type="checkbox" v-model="layers.layer35" @change="applyImmediate" />
        Layer 3.5 — Ground Clutter System
      </label>

      <label class="d-flex align-center cursor-pointer" style="gap:8px">
        <input type="checkbox" v-model="layers.layer4" @change="applyImmediate" />
        Layer 4 — Special & Rare Regions
      </label>

      <label class="d-flex align-center cursor-pointer" style="gap:8px">
        <input type="checkbox" v-model="layers.layer5" @change="applyImmediate" />
        Layer 5 — Visual Cohesion & Fantasy Push
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
        layer2: typeof savedLayers.layer2 === 'boolean' ? savedLayers.layer2 : true,
        layer3: typeof savedLayers.layer3 === 'boolean' ? savedLayers.layer3 : true,
        layer35: typeof savedLayers.layer35 === 'boolean' ? savedLayers.layer35 : true,
        layer4: typeof savedLayers.layer4 === 'boolean' ? savedLayers.layer4 : true,
        layer5: typeof savedLayers.layer5 === 'boolean' ? savedLayers.layer5 : true,
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
      try { this.apply(); } catch (e) {}
    },
    reset() {
      this.layers = { layer0: true, layer1: true, layer2: true, layer3: true, layer35: true, layer4: true, layer5: true };
      this.apply();
    }
  }
};
</script>
