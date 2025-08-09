<template>
  <div
    style="position: absolute; right: 6px; top: 28px; z-index: 2; background: rgba(0,0,0,0.55); color: #fff; padding: 8px 10px; border-radius: 6px; min-width: 220px;"
    @pointerdown.stop
    @pointermove.stop
    @pointerup.stop
    @click.stop
    @wheel.stop.prevent
    @contextmenu.stop.prevent
  >
    <!-- Rendering section -->
    <details open style="margin: 0 0 6px 0;">
      <summary style="cursor: pointer; user-select: none; outline: none; display: flex; align-items: center; gap: 8px; justify-content: space-between;">
        <button
          @click.stop.prevent="$emit('run-benchmark')"
          :disabled="benchmark?.running"
          style="background: rgba(255,255,255,0.12); color: #fff; border: 1px solid rgba(255,255,255,0.25); padding: 2px 6px; border-radius: 4px; font-size: 12px; cursor: pointer;"
        >
          {{ benchmark?.running ? 'Running…' : 'Run benchmark' }}
        </button>
        <span>Rendering</span>
      </summary>
      <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 6px; align-items: flex-end; text-align: right;">
        <div v-if="benchmark?.running" style="opacity: 0.8; align-self: flex-end; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px;">Benchmark running… averaging FPS over 10s</div>
        <div v-else-if="benchmark?.result" style="opacity: 0.9; align-self: flex-end; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px;">
          10s avg: {{ fmt(benchmark.result.avg, 1) }} FPS (min {{ fmt(benchmark.result.min, 1) }}, max {{ fmt(benchmark.result.max, 1) }}, frames {{ benchmark.result.frames }})
        </div>
        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
          <input
            type="checkbox"
            :checked="featuresLocal.clutter"
            @change="onToggleFeature('clutter', $event)"
          >
          Ground clutter
        </label>
        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
          <input
            type="checkbox"
            :checked="featuresLocal.shadows"
            @change="onToggleFeature('shadows', $event)"
          >
          Shadows
        </label>
        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
          <input
            type="checkbox"
            :checked="featuresLocal.water"
            @change="onToggleFeature('water', $event)"
          >
          Water
        </label>
        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
          <input
            type="checkbox"
            :checked="featuresLocal.sandUnderlay"
            @change="onToggleFeature('sandUnderlay', $event)"
          >
          Sand underlay
        </label>
        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
          <input
            type="checkbox"
            :checked="featuresLocal.chunkColors"
            @change="onToggleFeature('chunkColors', $event)"
          >
          Chunk colors
        </label>
        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
          <input
            type="checkbox"
            :checked="radialLocal.enabled"
            @change="onToggleRadialFade($event)"
          >
          Radial fade
        </label>
        <div style="display: flex; flex-direction: column; gap: 6px; width: 100%; margin-top: 6px;">
          <div style="display: flex; align-items: center; gap: 8px; justify-content: space-between;">
            <span style="opacity: 0.8;">Fade radius</span>
            <input
              :value="radialLocal.radius"
              @input="onSetRadial('radius', $event)"
              type="number"
              step="0.5"
              :disabled="!radialLocal.enabled"
              style="flex: 1;"
            >
          </div>
          <div style="display: flex; align-items: center; gap: 8px; justify-content: space-between;">
            <span style="opacity: 0.8;">Fade width</span>
            <input
              :value="radialLocal.width"
              @input="onSetRadial('width', $event)"
              type="number"
              step="0.25"
              :disabled="!radialLocal.enabled"
              style="flex: 1;"
            >
          </div>
          <div style="display: flex; align-items: center; gap: 8px; justify-content: space-between;">
            <span style="opacity: 0.8;">Min height scale</span>
            <input
              :value="radialLocal.minHeightScale"
              @input="onSetRadial('minHeightScale', $event)"
              type="number"
              min="0"
              max="0.5"
              step="0.01"
              :disabled="!radialLocal.enabled"
              style="flex: 1;"
            >
          </div>
        </div>
      </div>
    </details>

    <!-- Generation section -->
    <details open style="margin: 8px 0 0 0;">
      <summary style="cursor: pointer; user-select: none; outline: none; display: flex; align-items: center; gap: 8px; justify-content: space-between;">
        <span></span>
        <span>Generation</span>
      </summary>
      <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 6px; align-items: flex-end; text-align: right;">
        <div style="display: flex; align-items: center; gap: 8px; justify-content: space-between; width: 100%;">
          <span style="opacity: 0.8;">Scale</span>
          <input
            :value="genLocal.scale"
            @input="onSetGenerationScale($event)"
            type="number"
            step="0.01"
            style="flex: 1;"
          >
        </div>
        <div style="display: grid; grid-template-columns: auto 100px; gap: 6px 8px; width: 100%; margin-top: 6px;">
          <span style="opacity: 0.8; grid-column: 1 / -1; text-align: right;">Noise scales (debug)</span>
          <label style="opacity:0.8; text-align:right;">Continent</label>
          <input :value="genLocal.tuning.continentScale" type="number" step="0.01" @input="onSetTuning('continentScale', $event)" style="width:100%;">
          <label style="opacity:0.8; text-align:right;">Warp</label>
          <input :value="genLocal.tuning.warpScale" type="number" step="0.01" @input="onSetTuning('warpScale', $event)" style="width:100%;">
          <label style="opacity:0.8; text-align:right;">Warp strength</label>
          <input :value="genLocal.tuning.warpStrength" type="number" step="0.01" @input="onSetTuning('warpStrength', $event)" style="width:100%;">
          <label style="opacity:0.8; text-align:right;">Plate size</label>
          <input :value="genLocal.tuning.plateSize" type="number" step="0.01" @input="onSetTuning('plateSize', $event)" style="width:100%;">
          <label style="opacity:0.8; text-align:right;">Ridge</label>
          <input :value="genLocal.tuning.ridgeScale" type="number" step="0.01" @input="onSetTuning('ridgeScale', $event)" style="width:100%;">
          <label style="opacity:0.8; text-align:right;">Detail</label>
          <input :value="genLocal.tuning.detailScale" type="number" step="0.01" @input="onSetTuning('detailScale', $event)" style="width:100%;">
          <label style="opacity:0.8; text-align:right;">Climate belt</label>
          <input :value="genLocal.tuning.climateScale" type="number" step="0.01" @input="onSetTuning('climateScale', $event)" style="width:100%;">
        </div>
        <div style="opacity: 0.8;">{{ Number(genLocal.scale).toFixed(2) }}×</div>
        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; width: 100%; justify-content: flex-end;">
          <input
            type="checkbox"
            :checked="genLocal.expandNeighborhood"
            @change="onToggleExpandNeighborhood($event)"
          >
          10× neighborhood (debug)
        </label>
      </div>
    </details>
  </div>
</template>

<script>
export default {
  name: 'WorldDebugPanel',
  props: {
    features: { type: Object, required: true },
    radialFade: { type: Object, required: true },
    generation: { type: Object, required: true },
    benchmark: { type: Object, required: false },
  },
  emits: [
    'update:features',
    'update:radialFade',
    'update:generation',
    'toggle-clutter',
    'toggle-shadows',
    'toggle-water',
    'toggle-sand',
    'toggle-chunk-colors',
    'toggle-radial-fade',
    'generation-scale-change',
    'generator-tuning-change',
    'toggle-expand-neighborhood',
    'run-benchmark',
  ],
  computed: {
    featuresLocal() { return this.features || {}; },
    radialLocal() { return this.radialFade || {}; },
    genLocal() { return this.generation || { scale: 1, expandNeighborhood: false, tuning: {} }; },
  },
  methods: {
    fmt(v, n = 1) { if (v == null || Number.isNaN(v)) return '—'; const x = Number(v); return Math.abs(x) < 1e-6 ? '0' : x.toFixed(n); },
    onToggleFeature(key, e) {
      const next = { ...(this.featuresLocal || {}), [key]: !!e.target.checked };
      this.$emit('update:features', next);
      // Fire specific hooks for parent side-effects
      const map = {
        clutter: 'toggle-clutter', shadows: 'toggle-shadows', water: 'toggle-water', sandUnderlay: 'toggle-sand', chunkColors: 'toggle-chunk-colors',
      };
      const ev = map[key]; if (ev) this.$emit(ev);
    },
    onToggleRadialFade(e) {
      const next = { ...(this.radialLocal || {}), enabled: !!e.target.checked };
      this.$emit('update:radialFade', next);
      this.$emit('toggle-radial-fade');
    },
    onSetRadial(key, e) {
      const val = Number(e.target.value);
      const next = { ...(this.radialLocal || {}) };
      next[key] = val;
      this.$emit('update:radialFade', next);
      // Parent watches radialFade deeply for side-effects
    },
    onSetGenerationScale(e) {
      const scale = Number(e.target.value);
      const next = { ...(this.genLocal || {}), scale };
      this.$emit('update:generation', next);
      this.$emit('generation-scale-change');
    },
    onSetTuning(key, e) {
      const val = Number(e.target.value);
      const cur = this.genLocal || { tuning: {} };
      const tuning = { ...(cur.tuning || {}), [key]: val };
      const next = { ...cur, tuning };
      this.$emit('update:generation', next);
      this.$emit('generator-tuning-change');
    },
    onToggleExpandNeighborhood(e) {
      const next = { ...(this.genLocal || {}), expandNeighborhood: !!e.target.checked };
      this.$emit('update:generation', next);
      this.$emit('toggle-expand-neighborhood');
    },
  },
};
</script>
