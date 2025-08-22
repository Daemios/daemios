<template>
  <div
    class="live-metrics position-absolute d-flex flex-column align-end"
    :style="styleRoot"
    @pointerdown.stop
  >
    <!-- Micro panel -->
    <v-card
      class="pa-1 rounded"
      elevation="6"
      color="#041219"
      dark
      style="width: 180px; cursor: pointer"
      @click="toggleExpanded"
    >
      <v-row class="ma-0 pa-0" align="center">
        <v-col class="d-flex align-center" cols="3">
          <div class="text-subtitle-2 font-weight-bold">
            {{ fpsDisplay }}
          </div>
        </v-col>

        <v-col class="d-flex align-center" cols="9">
          <canvas ref="spark" height="14" class="w-100" />
        </v-col>

        <v-col class="d-flex justify-space-between" cols="12">
          <div>
            ms: <b>{{ lastFrameMs }}</b>
          </div>
          <div>
            calls: <b>{{ lastCalls }}</b>
          </div>
          <div>
            tris: <b>{{ lastTris }}</b>
          </div>
        </v-col>
      </v-row>
    </v-card>

    <v-card v-if="expanded" class="pa-3 mt-2" flat color="#041219" dark>
      <div class="d-flex align-center justify-space-between">
        <div class="text-h6">Live Metrics</div>
        <div class="d-flex align-center">
          <v-tabs
            v-model="activeTab"
            class="ma-0 pa-0"
            align="end"
            background-color="transparent"
            color="#6be1ff"
          >
            <v-tab value="overview"> Overview </v-tab>
            <v-tab value="breakdown"> Breakdown </v-tab>
          </v-tabs>
        </div>
      </div>

      <v-row class="ma-0 mt-3" dense>
        <template v-if="activeTab === 'overview'">
          <v-col cols="12" md="3">
            <v-card flat class="pa-3" color="transparent">
              <div
                class="text-subtitle-2"
                style="color: #8ff; margin-bottom: 6px"
              >
                Overview
              </div>
              <div style="font-size: 12px; color: #dfe">
                <div>
                  Frames: <b>{{ summary?.frames ?? "—" }}</b>
                </div>
                <div>
                  Avg ms: <b>{{ fmt(summary?.frameMs?.avg) }}</b> p90:
                  <b>{{ fmt(summary?.frameMs?.p90) }}</b> p99:
                  <b>{{ fmt(summary?.frameMs?.p99) }}</b>
                </div>
                <div>
                  Avg calls: <b>{{ fmt(summary?.calls?.avg, 0) }}</b> tris:
                  <b>{{ fmt(summary?.tris?.avg, 0) }}</b>
                </div>
              </div>
            </v-card>
          </v-col>

          <v-col cols="12" md="3">
            <v-card flat class="pa-3" color="transparent">
              <div class="text-subtitle-2" style="color: #8ff; margin-bottom: 6px">
                Diagnostics
              </div>
              <div style="font-size: 12px; color: #dfe; max-height: 160px; overflow: auto;">
                <div>
                  GPU timer available: <b>{{ profilerHasGPU ? 'yes' : 'no' }}</b>
                </div>
                <div style="height:6px"></div>
                <div>
                  CPU frame (last / avg):
                  <b>{{ diagnostics.cpu ? fmt(diagnostics.cpu.last,2) + ' / ' + fmt(diagnostics.cpu.avg,2) : '—' }}</b>
                </div>
                <div>
                  GPU frame (last / avg):
                  <b>{{ diagnostics.gpu ? fmt(diagnostics.gpu.last,2) + ' / ' + fmt(diagnostics.gpu.avg,2) : 'n/a' }}</b>
                </div>
                <div style="margin-top:8px; color:#9fe;">Top profiler entries (by avg)</div>
                <table style="width:100%; font-size:12px; color:#dfe; margin-top:6px">
                  <thead>
                    <tr><th style="text-align:left">label</th><th>avg ms</th><th>last</th></tr>
                  </thead>
                  <tbody>
                    <tr v-for="r in diagnostics.top" :key="r.label">
                      <td style="text-align:left">{{ r.label }}</td>
                      <td>{{ fmt(r.avg,2) }}</td>
                      <td>{{ fmt(r.last,2) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </v-card>
          </v-col>

          <v-col cols="12" md="6">
            <v-card flat class="pa-3" color="transparent">
              <div
                class="text-subtitle-2"
                style="color: #8ff; margin-bottom: 6px"
              >
                Timeline (last {{ samples.length }} frames)
              </div>
              <div>
                <canvas
                  ref="timeline"
                  width="640"
                  height="120"
                  style="
                    width: 100%;
                    height: 120px;
                    background: #071019;
                    border-radius: 4px;
                    display: block;
                  "
                />
              </div>
            </v-card>
          </v-col>
        </template>

        <template v-else-if="activeTab === 'breakdown'">
          <v-col cols="12">
            <v-card flat class="pa-3" color="transparent">
              <div
                class="text-subtitle-2"
                style="color: #8ff; margin-bottom: 6px"
              >
                Layer Breakdown
              </div>
              <div style="font-size: 12px; color: #dfe">
                Breakdown coming soon — will be added incrementally.
              </div>
            </v-card>
          </v-col>
        </template>
      </v-row>
    </v-card>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, reactive, computed } from "vue";
import { LiveSampler } from "@/3d2/metrics/LiveSampler";
import { profiler } from "@/utils/profiler";

const props = defineProps({
  // sceneWrapper may be a ref that's initially null; make optional to avoid prop warnings
  sceneWrapper: { type: Object, required: false, default: null },
  top: { type: Number, default: 12 },
  right: { type: Number, default: 12 },
});

const sampler = new LiveSampler({ maxSamples: 6000, sampleEvery: 1 });
const running = ref(true);
const expanded = ref(false);
const samples = reactive([]);
const last = ref(null);
const spark = ref(null);
const timeline = ref(null);
const diagTick = ref(0);
let diagInterval = null;
const activeTab = ref("overview");
let raf = null;

function start() {
  sampler.start();
  sampler.onSample((s) => {
    // push to reactive view (bounded)
    if (samples.length > 1000) samples.shift();
    samples.push(s);
    last.value = s;
  });
  running.value = true;
}
function stop() {
  sampler.stop();
  running.value = false;
}
function toggleRunning() {
  running.value ? stop() : start();
}
function clear() {
  sampler.clear();
  samples.splice(0, samples.length);
  last.value = null;
  redraw();
}

function fmt(v, n = 1) {
  if (v == null || Number.isNaN(v)) return "—";
  return Number(v).toFixed(n);
}

const summary = computed(() => sampler.summary());
const lastFrameMs = computed(() => {
  // Rolling average over the last 3 seconds
  const now = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
  const windowMs = 3000;
  let sum = 0;
  let count = 0;
  for (let i = samples.length - 1; i >= 0; i -= 1) {
    const s = samples[i];
    if (!s || typeof s.t !== 'number') continue;
    if (now - s.t <= windowMs) {
      if (typeof s.frameMs === 'number') {
        sum += s.frameMs;
        count += 1;
      }
    } else break;
  }
  if (count > 0) return fmt(sum / count, 2);
  return last.value ? fmt(last.value.frameMs, 2) : "—";
});
const lastCalls = computed(() => (last.value ? last.value.calls : "—"));
const lastTris = computed(() => (last.value ? last.value.tris : "—"));
const fpsDisplay = computed(() => {
  // Compute FPS from the mean frame time over the same 3s window so it matches ms display
  const now = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
  const windowMs = 3000;
  let sum = 0;
  let count = 0;
  for (let i = samples.length - 1; i >= 0; i -= 1) {
    const s = samples[i];
    if (!s || typeof s.t !== 'number') continue;
    if (now - s.t <= windowMs) {
      if (typeof s.frameMs === 'number') {
        sum += s.frameMs;
        count += 1;
      }
    } else break;
  }
  if (count > 0) {
    const meanMs = sum / count;
    const fps = meanMs > 0 ? Math.round(1000 / meanMs) : 0;
    return `${fps} fps`;
  }
  // fallback to last instantaneous if no recent samples
  if (!last.value) return "-- fps";
  const fps = last.value.frameMs ? Math.round(1000 / last.value.frameMs) : 0;
  return `${fps} fps`;
});
const lastLayers = computed(() => (last.value ? last.value.layers || {} : {}));

function drawSpark() {
  const c = spark.value;
  if (!c) return;
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, c.width, c.height);
  const N = Math.min(100, samples.length);
  if (!N) return;
  const w = c.width;
  const h = c.height;
  ctx.fillStyle = "rgba(0,0,0,0)";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "#6be1ff";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < N; i++) {
    const s = samples[samples.length - N + i];
    const v = Math.min(100, s.frameMs || 0);
    const x = (i / (N - 1 || 1)) * w;
    const y = h - (v / 100) * h;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function drawTimeline() {
  const c = timeline.value;
  if (!c) return;
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, c.width, c.height);
  const w = c.width,
    h = c.height;
  ctx.fillStyle = "#071019";
  ctx.fillRect(0, 0, w, h);
  // draw frameMs as line
  const N = Math.min(samples.length, Math.floor(w / 2));
  if (!N) return;
  ctx.strokeStyle = "#4ff";
  ctx.lineWidth = 1;
  ctx.beginPath();
  const maxMs = Math.max(...samples.slice(-N).map((s) => s.frameMs || 0), 16);
  for (let i = 0; i < N; i++) {
    const s = samples[samples.length - N + i];
    const x = Math.round((i / (N - 1 || 1)) * w);
    const y = Math.round(h - (Math.min(s.frameMs || 0, maxMs) / maxMs) * h);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function redraw() {
  drawSpark();
  drawTimeline();
}

onMounted(() => {
  // Disable GPU timing by default to avoid overhead; enable only when panel expanded
  try { if (profiler && typeof profiler.setGPUEnabled === 'function') profiler.setGPUEnabled(false); } catch (e) {}
  // Use coarse label sampling when collapsed to reduce overhead
  try { if (profiler && typeof profiler.setLabelSampleEvery === 'function') profiler.setLabelSampleEvery(8); } catch (e) {}
  // hook into scene RAF: attach sampler to wrapper's scene tick via nextTick polling
  let lastCall = performance.now();
  function loop() {
    try {
  // profiler frame lifecycle is driven by the main render loop (WorldMap)
      // collect quick metrics from scene wrapper
      // Avoid expensive scene inspection on frames that won't be recorded
      const willSample = ((sampler.frameCounter + 1) % sampler.sampleEvery) === 0;
      const mgr = props.sceneWrapper?.value;
      if (willSample) {
        let info = {};
        let layers = {};
        if (mgr && mgr._scene) {
          // best-effort: if sceneWrapper exposes getLayerMetrics, use it
          if (typeof mgr.getLayerMetrics === "function") {
            try {
              layers = mgr.getLayerMetrics() || {};
            } catch (e) {
              console.error("Error getting layer metrics:", e);
            }
          } else {
            // fallback: inspect common groups (only on sampled frames)
            try {
              const s = mgr._scene;
              const g = (name) => s.getObjectByName(name) || null;
              const clutter = g("clutterGroup");
              if (clutter)
                layers.clutter = {
                  visible: clutter.visible,
                  instanced:
                    clutter.count || (clutter.children && clutter.children.length) || 0,
                };
              const entities = g("entityGroup");
              if (entities)
                layers.entities = {
                  visible: entities.visible,
                  instanced:
                    entities.count || (entities.children && entities.children.length) || 0,
                };
              const terrain = g("terrainGroup");
              if (terrain)
                layers.terrain = {
                  visible: terrain.visible,
                  instanced:
                    terrain.count || (terrain.children && terrain.children.length) || 0,
                };
            } catch (e) {
              /* ignore */
            }
          }

          // try to read renderer.info from manager if present
          try {
            const man = mgr.manager || mgr._manager || null;
            if (man && man.renderer && man.renderer.info) info = man.renderer.info;
          } catch (e) {}
        }

        // attempt to measure render time by briefly instrumenting manager.render if available
        let renderMs = null;
        try {
          const man = mgr && (mgr.manager || mgr._manager);
          if (man && typeof man.render === "function") {
            // don't actually call render here — assume the scene is already rendering; just read info
            renderMs = null;
          }
        } catch (e) {
          console.error("Error measuring render time:", e);
        }

        // push a sample by calling sampler.sampleFrame with full payload
        try {
          sampler.sampleFrame({ renderMs, info, layers });
        } catch (e) {
          console.error("Error sampling frame:", e);
        }
      } else {
        // not sampling this frame: keep work minimal
        try {
          sampler.sampleFrame();
        } catch (e) {
          console.error("Error sampling frame:", e);
        }
      }

  // profiler frame lifecycle is driven by the main render loop (WorldMap)

  // redraw UI at most every 200ms (~5Hz) to reduce panel overhead
  const now = performance.now();
  if (!redraw._last || now - redraw._last > 200) {
        redraw();
  redraw._last = now;
  // bump diag tick so diagnostics computed property recalculates
  try { diagTick.value += 1; } catch (e) { /* ignore */ }
      }
    } catch (e) {
      /* ignore */
    }
    raf = requestAnimationFrame(loop);
  }
  start();
  loop();
  // Ensure diagnostics recompute regularly even if RAFs are out-of-sync
  try {
    diagInterval = setInterval(() => {
      try {
        diagTick.value += 1;
      } catch (e) {
        /* ignore */
      }
    }, 200);
  } catch (e) {
    /* ignore */
  }
});

onBeforeUnmount(() => {
  if (raf) cancelAnimationFrame(raf);
  stop();
  if (diagInterval) {
    try { clearInterval(diagInterval); } catch (e) {}
    diagInterval = null;
  }
});

function toggleExpanded() {
  expanded.value = !expanded.value;
  try {
    if (profiler && typeof profiler.setGPUEnabled === 'function') profiler.setGPUEnabled(expanded.value);
  } catch (e) {}
  try {
    if (profiler && typeof profiler.setLabelSampleEvery === 'function') profiler.setLabelSampleEvery(expanded.value ? 1 : 8);
  } catch (e) {}
}

function exportJson() {
  const data = {
    meta: { at: new Date().toISOString() },
    samples: sampler.snapshot(),
    summary: sampler.summary(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "metrics.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function exportCsv() {
  const s = sampler.snapshot();
  if (!s.length) return;
  const rows = ["t,frameMs,renderMs,calls,tris"];
  for (const r of s) {
    rows.push(
      `${r.t},${r.frameMs || ""},${r.renderMs || ""},${r.calls || 0},${
        r.tris || 0
      }`
    );
  }
  const blob = new Blob([rows.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "metrics.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const styleRoot = computed(() => ({
  right: props.right + "px",
  top: props.top + "px",
  zIndex: 120,
}));

const layerSummary = computed(() => {
  const snap = sampler.snapshot();
  const buckets = {};
  for (let i = 0; i < snap.length; i++) {
    const s = snap[i];
    if (!s || !s.layers) continue;
    for (const k in s.layers) {
      const v = s.layers[k];
      if (!buckets[k]) buckets[k] = { frames: 0, inst: [], uMs: [] };
      buckets[k].frames += 1;
      if (typeof v.instanced === "number") buckets[k].inst.push(v.instanced);
      if (typeof v.updateMs === "number") buckets[k].uMs.push(v.updateMs);
    }
  }
  const out = {};
  for (const k in buckets) {
    const b = buckets[k];
    const avgInst = b.inst.length
      ? b.inst.reduce((a, c) => a + c, 0) / b.inst.length
      : 0;
    const sorted = b.uMs.slice().sort((a, b) => a - b);
    const p90 = sorted.length ? sorted[Math.floor(sorted.length * 0.9)] : 0;
    const avgUMs = b.uMs.length
      ? b.uMs.reduce((a, c) => a + c, 0) / b.uMs.length
      : 0;
    out[k] = { frames: b.frames, avgInst, avgUMs, p90UMs: p90 };
  }
  return out;
});

const diagnostics = computed(() => {
  // touch diagTick to ensure this computed re-runs on the UI redraw cadence
  void diagTick.value;
  // Try profiler first
  const cpuStat = profiler && typeof profiler.stats === 'function' ? profiler.stats('frame.cpu') : null;
  const gpuStat = profiler && typeof profiler.stats === 'function' ? profiler.stats('frame.gpu') : null;
  const report = profiler && typeof profiler.getReport === 'function' ? profiler.getReport({ sortBy: 'avg', desc: true }) : [];
  // Fallback: use sampler summary for CPU frame time if profiler has no data
  if (!cpuStat) {
    try {
      const s = sampler.summary();
      if (s && s.frameMs) {
        const avg = s.frameMs.avg || null;
        const last = s.frameMs.last || null;
        if (avg != null || last != null) {
          return {
            cpu: {
              label: 'frame.cpu',
              last: last,
              avg: avg,
              min: s.frameMs.min || null,
              max: s.frameMs.max || null,
              samples: s.frames || 0,
            },
            gpu: gpuStat,
            top: report.slice(0, 6),
          };
        }
      }
    } catch (e) {
      /* ignore fallback errors */
    }
  }
  return { cpu: cpuStat, gpu: gpuStat, top: report.slice(0, 6) };
});

const profilerHasGPU = computed(() => !!(profiler && typeof profiler.hasGPU === 'function' ? profiler.hasGPU() : false));

// expose samples for debug
const expose = { sampler, samples };
</script>

<style scoped>
.live-metrics {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
  color: #cde;
}
</style>
