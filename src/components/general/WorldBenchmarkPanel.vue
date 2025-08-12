<template>
  <div
    class="world-benchmark-panel"
    style="position: absolute; bottom: 6px; left: 6px; width: 440px; height: 320px; padding: 8px 12px; background: rgba(0,0,0,0.55); color: #fff; border-radius: 6px; font-size: 12px; line-height: 1.2; pointer-events: auto; z-index: 20; display: block; box-shadow: 0 2px 8px rgba(0,0,0,0.18); overflow-x: auto; overflow-y: auto;"
    @pointerdown.stop
    @mousedown.stop
    @click.stop
    @touchstart.stop
  >
    <v-tabs
      v-model="tab"
      background-color="transparent"
      grow
      class="py-0"
      style="min-height: 28px; height: 28px; font-size: 11px;"
    >
      <v-tab
        value="general"
        style="min-width: 60px; height: 24px; padding: 0 8px; font-size: 11px;"
      >
        General
      </v-tab>
      <v-tab
        value="chunk"
        style="min-width: 60px; height: 24px; padding: 0 8px; font-size: 11px;"
      >
        Chunk
      </v-tab>
      <v-tab
        value="water"
        style="min-width: 60px; height: 24px; padding: 0 8px; font-size: 11px;"
      >
        Water
      </v-tab>
    </v-tabs>
    <div
      v-if="tab === 'general'"
      class="pa-2"
    >
      <pre style="white-space: pre-wrap; word-break: break-word;">{{ generalStatsDisplay }}</pre>
    </div>
    <div
      v-else-if="tab === 'chunk'"
      class="pa-2"
    >
      <pre style="white-space: pre-wrap; word-break: break-word;">{{ chunkStatsDisplay }}</pre>
    </div>
    <div
      v-else-if="tab === 'water'"
      class="pa-2"
    >
      <pre style="white-space: pre-wrap; word-break: break-word;">{{ waterStatsDisplay }}</pre>
    </div>
  </div>
</template>

<script>
import { useSettingsStore } from '@/stores/settingsStore';
export default {
  name: 'WorldBenchmarkPanel',
  props: {
    generalStats: { type: [String, Object], default: '' },
    chunkStats: { type: [String, Object], default: '' },
    waterStats: { type: [String, Object], default: '' },
  },
  data() {
    return {
      tab: 'general',
      liveStats: null,
      settings: null,
    };
  },
  mounted() {
    this.settings = useSettingsStore?.() ?? null;
    if (this.settings && this.settings.get) {
      const val = this.settings.get('benchmarkPanelTab', null);
      if (['chunk', 'general', 'water'].includes(val)) this.tab = val;
    }
  },
  watch: {
    tab(newTab) {
      if (this.settings && this.settings.setAtPath) {
        this.settings.setAtPath({ path: 'benchmarkPanelTab', value: newTab });
      }
    },
  },
  computed: {
    generalStatsDisplay() {
      if (!this.liveStats) return this.generalStats;
      const s = this.liveStats;
      const lines = [];
      lines.push(this.fmtStat(s.cpu, 'CPU'));
      lines.push(this.fmtStat(s.gpu, 'GPU'));
      lines.push(this.fmtStat(s.render, 'Render'));
      lines.push(this.fmtStat(s.fadeU, 'FadeU'));
      lines.push(this.fmtStat(s.tween, 'Tween'));
      lines.push(this.fmtStat(s.stream, 'Stream'));
      lines.push(this.fmtStat(s.slice, 'Slice'));
      lines.push(this.fmtStat(s.clutter, 'Clutter'));
      if (s.queueTotal) lines.push(`Queue Total: ${s.queueTotal.last ?? s.queueTotal.avg}`);
      if (s.queueRate) lines.push(`Queue Rate: ${(s.queueRate.last ?? 0).toFixed(1)}t/s`);
      if (s.queueEta) lines.push(`Queue ETA: ${s.queueEta.last ?? s.queueEta.avg}`);
      lines.push(`Draw Calls: ${s.dc}`);
      lines.push(`Triangles: ${s.tris}`);
      if (s.startup) lines.push('Startup: ' + this.fmtStartup(s.startup));
      return lines.join('\n');
    },
    chunkStatsDisplay() {
      if (!this.liveStats) return this.chunkStats;
      const s = this.liveStats;
      const lines = [];
      lines.push(this.fmtStat(s.chunk, 'Chunk'));
      lines.push(this.fmtStat(s.chunkCell, 'Chunk Cell'));
      lines.push(this.fmtStat(s.chunkMatrix, 'Chunk Matrix'));
      lines.push(this.fmtStat(s.chunkColor, 'Chunk Color'));
      if (s.queueTotal) lines.push(this.fmtStat(s.queueTotal, 'Queue Total'));
      if (s.queueRate) lines.push(`Queue Rate: ${(s.queueRate.last ?? s.queueRate.avg ?? 0).toFixed(1)}t/s`);
      if (s.queueDone && s.queueTasks) lines.push(`Queue Done: ${s.queueDone.last ?? s.queueDone.avg}/${s.queueTasks.last ?? s.queueTasks.avg}`);
      if (s.queueEta) lines.push(`Queue ETA: ${s.queueEta.last ?? s.queueEta.avg}`);
      if (s.queueLen != null && s.queueCursor != null) lines.push(`Queue: ${s.queueCursor}/${s.queueLen}`);
      if (s.instCount != null && s.instTarget != null) lines.push(`Instances: ${s.instCount}/${s.instTarget}`);
      return lines.join('\n');
    },
    waterStatsDisplay() {
      if (!this.liveStats) return this.waterStats;
      const s = this.liveStats;
      const lines = [];
      lines.push(this.fmtStat(s.water, 'Build'));
      lines.push(this.fmtStat(s.waterU, 'Uniform'));
      if (s.waterTexSize) lines.push(`Texture: ${s.waterTexSize}²`);
      if (s.waterCells != null) lines.push(`Cells: ${s.waterCells}`);
      if (s.waterPlaneW != null && s.waterPlaneH != null) lines.push(`Plane: ${s.waterPlaneW.toFixed(0)}x${s.waterPlaneH.toFixed(0)}`);
      if (s.waterTris != null) lines.push(`Tris: ${s.waterTris}`);
      return lines.join('\n');
    },
  },
  methods: {
    setStats(stats) {
      this.liveStats = stats;
    },
    fmtStat(stat, label) {
      if (!stat) return `${label}: --`;
      const avg = stat.avg != null ? (stat.avg < 0.095 ? (stat.avg * 1000).toFixed(2) + 'µs' : stat.avg.toFixed(2) + 'ms') : '--';
      const last = stat.last != null ? (stat.last < 0.095 ? (stat.last * 1000).toFixed(2) + 'µs' : stat.last.toFixed(2) + 'ms') : '--';
      return `${label}: ${avg} (last ${last})`;
    },
    fmtStartup(startup) {
      if (!startup) return '';
      const out = [];
      for (const [k, v] of Object.entries(startup)) {
        if (v && v.last != null) {
          out.push(`${k}: ${v.last < 0.095 ? (v.last * 1000).toFixed(1)+'µs' : v.last.toFixed(1)+'ms'}`);
        }
      }
      return out.join('  ');
    },
  },
};
</script>
