<template>
  <div
    class="worldgen-panel position-absolute text-white text-caption"
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
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
      <div style="font-size:13px;font-weight:600">World Gen</div>
      <div style="font-size:11px;opacity:0.8">Layer controls</div>
    </div>

    <div style="font-size:12px;margin-bottom:6px">Worldgen Layers</div>
    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px 10px">
      <label class="d-flex align-center cursor-pointer" style="gap:6px"><input type="checkbox" v-model="state.layers.layer0"> layer0 (palette)</label>
      <label class="d-flex align-center cursor-pointer" style="gap:6px"><input type="checkbox" v-model="state.layers.layer1"> layer1 (continents)</label>
      <label class="d-flex align-center cursor-pointer" style="gap:6px"><input type="checkbox" v-model="state.layers.layer2"> layer2 (regions)</label>
      <label class="d-flex align-center cursor-pointer" style="gap:6px"><input type="checkbox" v-model="state.layers.layer3"> layer3 (biomes)</label>
      <label class="d-flex align-center cursor-pointer" style="gap:6px"><input type="checkbox" v-model="state.layers.layer3_5"> layer3.5 (clutter)</label>
      <label class="d-flex align-center cursor-pointer" style="gap:6px"><input type="checkbox" v-model="state.layers.layer4"> layer4 (specials)</label>
      <label class="d-flex align-center cursor-pointer" style="gap:6px"><input type="checkbox" v-model="state.layers.layer5"> layer5 (visuals)</label>
    </div>

    <div style="margin-top:10px;border-top:1px dashed rgba(255,255,255,0.06);padding-top:8px">
      <div style="font-size:12px;font-weight:600;margin-bottom:6px">Layer1 (continents) tunables</div>
      <div style="display:flex;flex-direction:column;gap:8px">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div style="font-size:12px">Height multiplier</div>
          <div style="width:110px;display:flex;gap:8px;align-items:center">
            <input type="range" min="0" max="2" step="0.05" v-model.number="state.layer1.heightMult" @change="apply" />
            <div style="width:36px;text-align:right">{{ state.layer1.heightMult.toFixed(2) }}</div>
          </div>
        </div>

        <div class="gen-section">
          <h3>Debug</h3>
          <div style="display:flex;flex-direction:column;gap:6px">
            <label style="font-size:12px">Debug pattern</label>
            <select v-model="state.layer1.debugPattern" @change="apply" style="width:100%">
              <option value="">(none)</option>
              <option value="world-square">World-aligned square (recommended)</option>
              <option value="axial-square">Axial-aligned square (legacy)</option>
            </select>
            <div style="display:flex;gap:8px;align-items:center;margin-top:6px">
              <label style="font-size:12px">Square size</label>
              <input type="number" min="1" max="64" step="1" v-model.number="state.layer1.testSquareSize" style="width:80px" @change="apply" />
            </div>
            <div style="display:flex;gap:8px;align-items:center">
              <label style="font-size:12px">Center Q</label>
              <input type="number" v-model.number="state.layer1.testSquareCenterQ" @change="apply" />
              <label style="font-size:12px">Center R</label>
              <input type="number" v-model.number="state.layer1.testSquareCenterR" @change="apply" />
            </div>
          </div>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center">
          <div style="font-size:12px">Mesoscale scale</div>
          <input type="number" min="1" max="256" step="1" v-model.number="state.layer1.scale" style="width:80px" @change="apply" />
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center">
          <div style="font-size:12px">Sea level</div>
          <div style="width:140px;display:flex;gap:8px;align-items:center">
            <input type="range" min="0" max="1" step="0.01" v-model.number="state.layer1.seaLevel" @change="apply" />
            <div style="width:36px;text-align:right">{{ state.layer1.seaLevel.toFixed(2) }}</div>
          </div>
        </div>

            <div style="display:flex;justify-content:space-between;align-items:center">
              <div style="font-size:12px">Plate cell size</div>
              <input type="number" min="4" max="256" step="1" v-model.number="state.layer1.plateCellSize" style="width:80px" @change="apply" />
            </div>

            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px">
              <div style="font-size:12px">Debug: square</div>
              <div style="display:flex;gap:8px;align-items:center">
                <input type="checkbox" v-model="_debugSquare" @change="onDebugToggle" />
              </div>
            </div>

            <div v-if="_debugSquare" style="display:flex;flex-direction:column;gap:6px;margin-top:6px">
              <div style="display:flex;justify-content:space-between;align-items:center">
                <div style="font-size:12px">Square size (tiles)</div>
                <input type="number" min="1" max="64" step="1" v-model.number="state.layer1.testSquareSize" style="width:80px" @change="apply" />
              </div>
              <div style="display:flex;gap:8px">
                <div style="display:flex;flex-direction:column;gap:4px;flex:1">
                  <div style="font-size:12px">Center Q</div>
                  <input type="number" v-model.number="state.layer1.testSquareCenterQ" @change="apply" />
                </div>
                <div style="display:flex;flex-direction:column;gap:4px;flex:1">
                  <div style="font-size:12px">Center R</div>
                  <input type="number" v-model.number="state.layer1.testSquareCenterR" @change="apply" />
                </div>
              </div>
            </div>
          </div>
        </div>

    <div style="border-top:1px solid rgba(255,255,255,0.08);padding-top:8px;margin-top:8px">
      <div style="display:flex;justify-content:space-between">
        <button
          style="background: rgba(43, 136, 136, 0.95);border:none;padding:6px 10px;border-radius:4px;color:#012;font-weight:600;"
          @click="apply"
        >
          Apply
        </button>
        <button
          style="background:transparent;border:1px solid rgba(255,255,255,0.12);padding:6px 10px;border-radius:4px;color:inherit;"
          @click="reset"
        >
          Reset
        </button>
      </div>
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
    const savedGeneration = saved.generation || {};
    const savedCfg = (savedGeneration.config && savedGeneration.config.layers) || {};
    return {
      settings,
      state: {
        layers: Object.assign({ layer0: true, layer1: true, layer2: true, layer3: true, layer3_5: true, layer4: true, layer5: true }, savedCfg.enabled || {}),
        layer1: Object.assign({ heightMult: 1.0, scale: 12, seaLevel: 0.52, plateCellSize: 48, debugPattern: '', testSquareSize: 6, testSquareCenterQ: 0, testSquareCenterR: 0 }, savedCfg.layer1 || {})
      },
  _debugSquare: false
    };
  },
  mounted() {
    // Rehydrate saved worldMap generation layer settings on mount so the panel
    // always reflects persisted choices after a reload.
    try {
      const saved = this.settings && typeof this.settings.get === 'function' ? this.settings.get('worldMap', {}) : {};
      const savedGeneration = saved.generation || {};
      const savedCfg = (savedGeneration.config && savedGeneration.config.layers) || {};
      // Merge booleans/objects conservatively to avoid breaking the reactive state
      this.state.layers = Object.assign({ layer0: true, layer1: true, layer2: true, layer3: true, layer3_5: true, layer4: true, layer5: true }, savedCfg.enabled || {});
  this.state.layer1 = Object.assign({ heightMult: 1.0, scale: 12, seaLevel: 0.52, plateCellSize: 48, debugPattern: '', testSquareSize: 6, testSquareCenterQ: 0, testSquareCenterR: 0 }, savedCfg.layer1 || {});
    } catch (e) {
      /* ignore rehydrate errors */
    }
  },
  methods: {
  // legacy handler retained for backward-compat but UI now uses select
    apply() {
      // include mapRadius if present in settings.generation.radius so Apply updates grid size
      const saved = this.settings && typeof this.settings.get === 'function' ? this.settings.get('worldMap', {}) : {};
      const genSaved = saved.generation || {};
      const mapRadius = Number(genSaved.radius || this.settings.get?.('mapRadius') || this._lastMapRadius) || 0;
    // ensure debugPattern is included when set
    const layer1Payload = Object.assign({}, this.state.layer1);
    if (this._debugSquare) layer1Payload.debugPattern = 'square'; else delete layer1Payload.debugPattern;
    const payload = { mapRadius, generationConfig: { layers: { enabled: Object.assign({}, this.state.layers), layer1: layer1Payload } } };
      try {
        if (this.settings && typeof this.settings.mergeAtPath === 'function') {
      // persist the same shape we send in the payload
      this.settings.mergeAtPath({ path: 'worldMap', value: { generation: { config: { layers: { enabled: Object.assign({}, this.state.layers), layer1: layer1Payload } } } } });
        }
      } catch (e) { /* ignore */ }
      this.$emit('apply', payload);
    },
    reset() {
      this.state.layers = { layer0: true, layer1: true, layer2: true, layer3: true, layer3_5: true, layer4: true, layer5: true };
      this.state.layer1 = { heightMult: 1.0, scale: 12, seaLevel: 0.52, plateCellSize: 48 };
      this.apply();
    }
  }
};
</script>
