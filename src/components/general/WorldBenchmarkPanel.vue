<template>
  <div class="world-benchmark-panel" style="position: absolute; bottom: 6px; left: 6px; padding: 8px 12px; background: rgba(0,0,0,0.55); color: #fff; border-radius: 6px; min-width: 220px; font-size: 12px; line-height: 1.2; pointer-events: auto; max-width: 420px; z-index: 2; display: block; box-shadow: 0 2px 8px rgba(0,0,0,0.18);">
    <v-tabs v-model="tab" background-color="transparent" grow
      class="py-0" style="min-height: 28px; height: 28px; font-size: 11px;">
      <v-tab value="general" style="min-width: 60px; height: 24px; padding: 0 8px; font-size: 11px;">General</v-tab>
      <v-tab value="chunk" style="min-width: 60px; height: 24px; padding: 0 8px; font-size: 11px;">Chunk</v-tab>
    </v-tabs>
    <v-tabs-items v-model="tab">
      <v-tab-item value="general">
        <div class="pa-2">
          <pre>{{ generalStatsDisplay }}</pre>
        </div>
      </v-tab-item>
      <v-tab-item value="chunk">
        <div class="pa-2">
          <pre>{{ chunkStatsDisplay }}</pre>
        </div>
      </v-tab-item>
    </v-tabs-items>
  </div>
</template>

<script>
export default {
  name: 'WorldBenchmarkPanel',
  props: {
    generalStats: { type: [String, Object], default: '' },
    chunkStats: { type: [String, Object], default: '' },
  },
  data() {
    return {
      tab: 'general',
      liveStats: null,
    };
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
      lines.push(this.fmtStat(s.waterU, 'WaterU'));
      lines.push(this.fmtStat(s.stream, 'Stream'));
      lines.push(this.fmtStat(s.slice, 'Slice'));
      lines.push(this.fmtStat(s.clutter, 'Clutter'));
      lines.push(this.fmtStat(s.water, 'Water'));
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
      if (s.queueLen != null && s.queueCursor != null) lines.push(`Queue: ${s.queueCursor}/${s.queueLen}`);
      if (s.instCount != null && s.instTarget != null) lines.push(`Instances: ${s.instCount}/${s.instTarget}`);
      return lines.join('\n');
    },
  },
};
</script>
