<template>
  <div
    class="live-metrics position-absolute"
    :style="styleRoot"
    @pointerdown.stop
  >
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
              <div
                class="text-subtitle-2"
                style="color: #8ff; margin-bottom: 6px"
              >
                Layers (last)
              </div>
              <div
                style="
                  font-size: 12px;
                  color: #dfe;
                  max-height: 160px;
                  overflow: auto;
                "
              >
                <v-simple-table>
                  <thead>
                    <tr>
                      <th>layer</th>
                      <th>vis</th>
                      <th>inst</th>
                      <th>uMs</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(v, k) in lastLayers" :key="k">
                      <td>{{ k }}</td>
                      <td>{{ v.visible ?? "—" }}</td>
                      <td>{{ v.instanced ?? "—" }}</td>
                      <td>{{ v.updateMs ?? "—" }}</td>
                    </tr>
                  </tbody>
                </v-simple-table>
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

const props = defineProps({
  sceneWrapper: { type: Object, required: true },
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
const lastFrameMs = computed(() =>
  last.value ? fmt(last.value.frameMs, 2) : "—"
);
const lastCalls = computed(() => (last.value ? last.value.calls : "—"));
const lastTris = computed(() => (last.value ? last.value.tris : "—"));
const fpsDisplay = computed(() => {
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
  // hook into scene RAF: attach sampler to wrapper's scene tick via nextTick polling
  let lastCall = performance.now();
  function loop() {
    try {
      // collect quick metrics from scene wrapper
      const mgr = props.sceneWrapper?.value;
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
          // fallback: inspect common groups
          try {
            const s = mgr._scene;
            const g = (name) => {
              const o = s.getObjectByName(name);
              return o || null;
            };
            const clutter = g("clutterGroup");
            if (clutter)
              layers.clutter = {
                visible: clutter.visible,
                instanced:
                  clutter.count ||
                  (clutter.children && clutter.children.length) ||
                  0,
              };
            const entities = g("entityGroup");
            if (entities)
              layers.entities = {
                visible: entities.visible,
                instanced:
                  entities.count ||
                  (entities.children && entities.children.length) ||
                  0,
              };
            const terrain = g("terrainGroup");
            if (terrain)
              layers.terrain = {
                visible: terrain.visible,
                instanced:
                  terrain.count ||
                  (terrain.children && terrain.children.length) ||
                  0,
              };
          } catch (e) {
            /* ignore */
          }
        }

        // try to read renderer.info from manager if present
        try {
          const man = mgr.manager || mgr._manager || null;
          if (man && man.renderer && man.renderer.info)
            info = man.renderer.info;
        } catch (e) {}
      }

      // attempt to measure render time by briefly instrumenting manager.render if available
      let renderMs = null;
      try {
        const man = mgr && (mgr.manager || mgr._manager);
        if (man && typeof man.render === "function") {
          const t0 = performance.now();
          // don't actually call render here — assume the scene is already rendering; just read info
          renderMs = null;
        }
      } catch (e) {
        console.error("Error measuring render time:", e);
      }

      // push a sample by calling sampler.sampleFrame
      try {
        sampler.sampleFrame({ renderMs, info, layers });
      } catch (e) {
        console.error("Error sampling frame:", e);
      }

      // redraw UI at ~15fps
      const now = performance.now();
      if (!redraw._last || now - redraw._last > 66) {
        redraw();
        redraw._last = now;
      }
    } catch (e) {
      /* ignore */
    }
    raf = requestAnimationFrame(loop);
  }
  start();
  loop();
});

onBeforeUnmount(() => {
  if (raf) cancelAnimationFrame(raf);
  stop();
});

function toggleExpanded() {
  expanded.value = !expanded.value;
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

// expose samples for debug
const expose = { sampler, samples };
</script>

<style scoped>
.live-metrics {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
  color: #cde;
}
</style>
