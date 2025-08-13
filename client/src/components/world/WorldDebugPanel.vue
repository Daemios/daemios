<script setup>
import AddLocationButton from './AddLocationButton.vue';
defineProps({
  playerPosition: {
    type: Object,
    default: () => ({ chunkX: 0, chunkY: 0, hexQ: 0, hexR: 0 })
  }
});
</script>
<template>
  <div
    class="position-absolute text-white py-2 px-3 rounded text-caption"
    style="right: 6px; top: 28px; z-index: 2; background: rgba(0,0,0,0.55); min-width: 220px; line-height: 1.2;"
    @pointerdown.stop
    @pointermove.stop
    @pointerup.stop
    @click.stop
    @wheel.stop.prevent
    @contextmenu.stop.prevent
  >
    <!-- Rendering section -->
    <details
      open
      style="margin: 0 0 6px 0;"
    >
      <summary
        class="cursor-pointer user-select-none d-flex align-center ga-2 justify-space-between"
        style="outline: none;"
      >
        <span>Rendering</span>
        <button
          style="background: rgba(255,255,255,0.12); color: #fff; border: 1px solid rgba(255,255,255,0.25); padding: 2px 6px; border-radius: 4px; font-size: 12px; cursor: pointer;"
          @click.stop.prevent="onToggleStatsPane()"
        >
          {{ statsVisible ? 'Hide Stats' : 'Show Stats' }}
        </button>
      </summary>
      <div
        class="d-flex flex-column align-stretch"
        style="gap: 6px; margin-top: 6px;"
      >
        <div
          v-if="benchmark?.running"
          class="opacity-80 text-mono"
        >
          Benchmark running… 10s avg
        </div>
        <div
          v-else-if="benchmark?.result"
          class="opacity-90 text-mono"
        >
          10s avg: {{ fmt(benchmark.result.avg, 1) }} FPS (min {{ fmt(benchmark.result.min, 1) }}, max {{ fmt(benchmark.result.max, 1) }})
        </div>

        <!-- Feature toggles in compact grid -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px 10px;">
          <label
            class="d-flex align-center cursor-pointer"
            style="gap: 6px;"
          ><input
            type="checkbox"
            :checked="featuresLocal.clutter"
            @change="onToggleFeature('clutter', $event)"
          > Clutter</label>
          <label
            class="d-flex align-center cursor-pointer"
            style="gap: 6px;"
          ><input
            type="checkbox"
            :checked="featuresLocal.shadows"
            @change="onToggleFeature('shadows', $event)"
          > Shadows</label>
          <label
            class="d-flex align-center cursor-pointer"
            style="gap: 6px;"
          ><input
            type="checkbox"
            :checked="featuresLocal.water"
            @change="onToggleFeature('water', $event)"
          > Water</label>
          <label
            class="d-flex align-center cursor-pointer"
            style="gap: 6px;"
          ><input
            type="checkbox"
            :checked="featuresLocal.chunkColors"
            @change="onToggleFeature('chunkColors', $event)"
          > Chunk colors</label>
          <label
            class="d-flex align-center cursor-pointer"
            style="gap: 6px;"
          ><input
            type="checkbox"
            :checked="radialLocal.enabled"
            @change="onToggleRadialFade($event)"
          > Radial fade</label>
          <label
            class="d-flex align-center cursor-pointer"
            style="gap: 6px;"
          ><input
            type="checkbox"
            :checked="featuresLocal.directions"
            @change="onToggleFeature('directions', $event)"
          > Directions</label>
        </div>

        <!-- Radial fade controls (compact grid) -->
        <div style="display: grid; grid-template-columns: auto 90px; gap: 4px 8px; align-items: center; margin-top: 6px;">
          <span class="opacity-80 text-right">Fade radius</span>
          <input
            :value="radialLocal.radius"
            type="number"
            step="0.5"
            :disabled="!radialLocal.enabled"
            class="w-100"
            @input="onSetRadial('radius', $event)"
          >
          <span class="opacity-80 text-right">Fade width</span>
          <input
            :value="radialLocal.width"
            type="number"
            step="0.25"
            :disabled="!radialLocal.enabled"
            class="w-100"
            @input="onSetRadial('width', $event)"
          >
          <span class="opacity-80 text-right">Min height</span>
          <input
            :value="radialLocal.minHeightScale"
            type="number"
            min="0"
            max="0.5"
            step="0.01"
            :disabled="!radialLocal.enabled"
            class="w-100"
            @input="onSetRadial('minHeightScale', $event)"
          >
        </div>
      </div>
    </details>

    <!-- Generation section -->
    <details
      open
      style="margin: 8px 0 0 0;"
    >
      <summary
        class="cursor-pointer user-select-none d-flex align-center ga-2 justify-space-between"
        style="outline: none;"
      >
        <span>Generation</span>
        <span class="opacity-80">{{ Number(genLocal.scale).toFixed(2) }}×</span>
      </summary>
      <div
        class="d-flex flex-column"
        style="gap: 6px; margin-top: 6px;"
      >
        <div style="display: grid; grid-template-columns: auto 90px; gap: 4px 8px; align-items: center;">
          <span class="opacity-80 text-right">Version</span>
          <select
            :value="genLocal.version"
            class="w-100"
            @change="onSetGeneratorVersion($event)"
          >
            <option
              v-for="v in generatorVersions"
              :key="v"
              :value="v"
            >
              {{ v }}
            </option>
          </select>
        </div>
        <div style="display: grid; grid-template-columns: auto 90px; gap: 4px 8px; align-items: center;">
          <span class="opacity-80 text-right">Scale</span>
          <input
            :value="genLocal.scale"
            type="number"
            step="0.01"
            class="w-100"
            @input="onSetGenerationScale($event)"
          >
        </div>

        <!-- Map size (absolute radius) -->
        <div style="display: grid; grid-template-columns: auto 1fr; gap: 4px 8px; align-items: center;">
          <span class="opacity-80 text-right">Map size</span>
          <div style="display: flex; gap: 6px; flex-wrap: wrap;">
            <button
              :disabled="genLocal.radius === 1"
              style="background: rgba(255,255,255,0.12); color: #fff; border: 1px solid rgba(255,255,255,0.25); padding: 2px 6px; border-radius: 4px; font-size: 12px; cursor: pointer;"
              @click.stop.prevent="onSelectRadiusPreset(1)"
            >
              Small
            </button>
            <button
              :disabled="genLocal.radius === 5"
              style="background: rgba(255,255,255,0.12); color: #fff; border: 1px solid rgba(255,255,255,0.25); padding: 2px 6px; border-radius: 4px; font-size: 12px; cursor: pointer;"
              @click.stop.prevent="onSelectRadiusPreset(5)"
            >
              Default (10×)
            </button>
            <button
              :disabled="genLocal.radius === 8"
              style="background: rgba(255,255,255,0.12); color: #fff; border: 1px solid rgba(255,255,255,0.25); padding: 2px 6px; border-radius: 4px; font-size: 12px; cursor: pointer;"
              @click.stop.prevent="onSelectRadiusPreset(8)"
            >
              Large
            </button>
            <button
              :disabled="genLocal.radius === 12"
              style="background: rgba(255,255,255,0.12); color: #fff; border: 1px solid rgba(255,255,255,0.25); padding: 2px 6px; border-radius: 4px; font-size: 12px; cursor: pointer;"
              @click.stop.prevent="onSelectRadiusPreset(12)"
            >
              Huge
            </button>
          </div>
        </div>
        <div style="display: grid; grid-template-columns: auto 90px; gap: 4px 8px; align-items: center;">
          <span class="opacity-80 text-right">Neighborhood radius</span>
          <input
            :value="genLocal.radius ?? 1"
            type="number"
            min="1"
            step="1"
            class="w-100"
            @change="onSetNeighborhoodRadius($event)"
          >
          <div
            class="opacity-80"
            style="grid-column: 1 / span 2;"
          >
            <span>Renders {{ (2 * (genLocal.radius ?? 1) + 1) }}×{{ (2 * (genLocal.radius ?? 1) + 1) }} chunks</span>
          </div>
        </div>

        <!-- Collapse advanced tuning for compactness -->
        <details style="margin-top: 2px;">
          <summary
            class="cursor-pointer user-select-none"
            style="outline: none; opacity: 0.85;"
          >
            Noise tuning (debug)
          </summary>
          <div style="display: grid; grid-template-columns: auto 90px; gap: 4px 8px; align-items: center; margin-top: 6px;">
            <label class="opacity-80 text-right">Continent</label>
            <input
              :value="genLocal.tuning.continentScale"
              type="number"
              step="0.01"
              class="w-100"
              @input="onSetTuning('continentScale', $event)"
            >
            <label class="opacity-80 text-right">Warp</label>
            <input
              :value="genLocal.tuning.warpScale"
              type="number"
              step="0.01"
              class="w-100"
              @input="onSetTuning('warpScale', $event)"
            >
            <label class="opacity-80 text-right">Warp strength</label>
            <input
              :value="genLocal.tuning.warpStrength"
              type="number"
              step="0.01"
              class="w-100"
              @input="onSetTuning('warpStrength', $event)"
            >
            <label class="opacity-80 text-right">Plate size</label>
            <input
              :value="genLocal.tuning.plateSize"
              type="number"
              step="0.01"
              class="w-100"
              @input="onSetTuning('plateSize', $event)"
            >
            <label class="opacity-80 text-right">Ridge</label>
            <input
              :value="genLocal.tuning.ridgeScale"
              type="number"
              step="0.01"
              class="w-100"
              @input="onSetTuning('ridgeScale', $event)"
            >
            <label class="opacity-80 text-right">Detail</label>
            <input
              :value="genLocal.tuning.detailScale"
              type="number"
              step="0.01"
              class="w-100"
              @input="onSetTuning('detailScale', $event)"
            >
            <label class="opacity-80 text-right">Climate belt</label>
            <input
              :value="genLocal.tuning.climateScale"
              type="number"
              step="0.01"
              class="w-100"
              @input="onSetTuning('climateScale', $event)"
            >
            <span class="opacity-80 text-right">Ocean encaps.</span>
            <input
              :value="genLocal.tuning.oceanEncapsulation"
              type="number"
              step="0.01"
              min="0"
              max="1"
              class="w-100"
              @input="onSetTuning('oceanEncapsulation', $event)"
            >
            <span class="opacity-80 text-right">Sea bias</span>
            <input
              :value="genLocal.tuning.seaBias"
              type="number"
              step="0.01"
              class="w-100"
              @input="onSetTuning('seaBias', $event)"
            >
          </div>
        </details>

        <!-- Removed legacy 10× neighborhood toggle in favor of absolute radius control -->
      </div>
    </details>

    <!-- Actions (debug/gameplay) -->
    <details
      open
      style="margin: 8px 0 0 0;"
    >
      <summary
        class="cursor-pointer user-select-none"
        style="outline: none;"
      >
        Actions
      </summary>
      <div
        class="d-flex flex-wrap"
        style="gap: 6px; margin-top: 6px;"
      >
  <AddLocationButton :player-position="playerPosition" />
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
  benchmark: { type: Object, required: false, default: null },
  statsVisible: { type: Boolean, required: false, default: true },
  generatorVersions: { type: Array, required: false, default: () => [] },
  },
  emits: [
    'update:features',
    'update:radialFade',
    'update:generation',
    'toggle-clutter',
    'toggle-shadows',
    'toggle-water',
    'toggle-chunk-colors',
  'toggle-directions',
  'create-location',
    'toggle-radial-fade',
    'generation-scale-change',
    'generator-tuning-change',
  'toggle-stats-pane',
  'set-neighborhood-radius',
    'run-benchmark',
  // Gameplay actions
  'create-town',
  'generator-version-change',
  ],
  computed: {
    featuresLocal() { return this.features || {}; },
    radialLocal() { return this.radialFade || {}; },
  genLocal() {
      return this.generation || { scale: 1, tuning: {}, version: this.generatorVersions?.[0] };
    },
  },
  methods: {
    fmt(v, n = 1) { if (v == null || Number.isNaN(v)) return '—'; const x = Number(v); return Math.abs(x) < 1e-6 ? '0' : x.toFixed(n); },
    onToggleFeature(key, e) {
      const next = { ...(this.featuresLocal || {}), [key]: !!e.target.checked };
      this.$emit('update:features', next);
      // Fire specific hooks for parent side-effects
      const map = {
  clutter: 'toggle-clutter', shadows: 'toggle-shadows', water: 'toggle-water', chunkColors: 'toggle-chunk-colors', directions: 'toggle-directions',
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
  onToggleStatsPane() { this.$emit('toggle-stats-pane'); },
    onSetNeighborhoodRadius(e) {
      const radius = Math.max(1, Number(e.target.value) || 1);
      const next = { ...(this.genLocal || {}), radius };
      this.$emit('update:generation', next);
      this.$emit('set-neighborhood-radius', radius);
    },
    onSelectRadiusPreset(radius) {
      const r = Math.max(1, Number(radius) || 1);
      const next = { ...(this.genLocal || {}), radius: r };
      this.$emit('update:generation', next);
      this.$emit('set-neighborhood-radius', r);
    },
  // Removed legacy neighborhood expansion toggle
    onSetGeneratorVersion(e) {
      const version = e.target.value;
      const next = { ...(this.genLocal || {}), version };
      this.$emit('update:generation', next);
      this.$emit('generator-version-change');
    },
  },
};
</script>
