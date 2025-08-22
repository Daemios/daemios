// Lightweight frame profiler for CPU timings with optional WebGL GPU time queries.
// Usage:
//  profiler.beginFrame(); profiler.start('label'); ... profiler.end('label'); profiler.endFrame();
//  profiler.push('label', ms) to record custom durations.
//  const report = profiler.getReport(); // [{ label, last, avg, min, max, samples }]

export class FrameProfiler {
  constructor({ maxSamples = 240 } = {}) {
    this.maxSamples = Math.max(16, maxSamples | 0);
    this._starts = new Map(); // label -> t0
    this._series = new Map(); // label -> Float64Array ring buffer
    this._idx = new Map(); // label -> write index
    this._count = new Map(); // label -> count (<= maxSamples)
    this._last = new Map(); // label -> last value
  this._frameT0 = null;
    this._gpu = null; // optional GPU timer interface
    this._gpuEnabled = true; // allow runtime toggling of GPU queries
  this._frameCounter = 0; // increments each beginFrame
  this._labelSampleEvery = 4; // only record label durations every N frames (reduce overhead)
  }

  // Allow runtime enabling/disabling of GPU timer enqueueing to reduce driver overhead
  setGPUEnabled(v) {
    this._gpuEnabled = !!v;
  }
  isGPUEnabled() {
    return !!this._gpuEnabled;
  }

  setGPU(gpu) {
    // attach/detach GPU timer (no logging)
    try {
      // intentionally no logging here
    } catch (e) {}
    this._gpu = gpu || null;
  }

  // Quick helper for callers to know if a GPU timer is attached
  hasGPU() {
    return !!this._gpu;
  }

  // Debug helper callable from console: returns basic GPU timer state and a single poll result
  debugGPU() {
    try {
      if (!this._gpu) return { hasGPU: false };
      const pollFn = this._gpu.poll;
      const pollRes = typeof pollFn === 'function' ? pollFn() : null;
      return { hasGPU: true, poll: pollRes };
    } catch (e) {
      return { error: String(e) };
    }
  }

  now() {
    return typeof performance !== "undefined" && performance.now
      ? performance.now()
      : Date.now();
  }

  beginFrame() {
    try {
      this._frameT0 = this.now();
      // advance frame counter used for label sampling
      this._frameCounter = (this._frameCounter + 1) | 0;
    } catch (e) {
      // swallow any timing errors
    }
  }

  endFrame() {
    try {
      if (this._frameT0 == null) {
        // no logging: missing beginFrame
        return 0;
      }
      const dt = this.now() - this._frameT0;
      // no logging of frame timing
      this.push("frame.cpu", dt);
    // Poll GPU timer if available (returns time for a previous frame if ready)
    if (this._gpu && typeof this._gpu.poll === "function") {
      const gpuMs = this._gpu.poll();
      if (gpuMs != null && isFinite(gpuMs)) this.push("frame.gpu", gpuMs);
    }
  this._frameT0 = null;
      return dt;
    } catch (e) {
      return 0;
    }
  }

  start(label) {
    this._starts.set(label, this.now());
  }
  end(label) {
    const t0 = this._starts.get(label);
    if (t0 == null) return 0;
    const dt = this.now() - t0;
    this._starts.delete(label);
    // Record label durations only on a sampling interval to reduce profiler overhead.
    // Always push frame.cpu via endFrame; for other labels sample every _labelSampleEvery frames.
    try {
      const shouldPush = (label === 'frame.cpu') || (this._frameCounter % Math.max(1, this._labelSampleEvery) === 0);
      if (shouldPush) this.push(label, dt);
    } catch (e) {
      // ignore push failures
    }
    return dt;
  }

  setLabelSampleEvery(n) {
    const v = Math.max(1, Math.floor(n) || 1);
    this._labelSampleEvery = v;
  }

  getLabelSampleEvery() {
    return this._labelSampleEvery;
  }

  measure(label, fn) {
    const t0 = this.now();
    try {
      return fn();
    } finally {
      this.push(label, this.now() - t0);
    }
  }

  push(label, ms) {
    if (ms == null || !isFinite(ms)) return;
    let arr = this._series.get(label);
    if (!arr) {
      arr = new Float64Array(this.maxSamples);
      this._series.set(label, arr);
      this._idx.set(label, 0);
      this._count.set(label, 0);
    }
    const i = (this._idx.get(label) || 0) % this.maxSamples;
    arr[i] = ms;
    this._idx.set(label, i + 1);
    const prevCount = this._count.get(label) || 0;
    this._count.set(label, Math.min(this.maxSamples, prevCount + 1));
    this._last.set(label, ms);
  }

  stats(label) {
    const arr = this._series.get(label);
    const n = this._count.get(label) || 0;
    if (!arr || n === 0) return null;
    let sum = 0,
      min = Infinity,
      max = -Infinity;
    for (let k = 0; k < n; k += 1) {
      const v = arr[k];
      sum += v;
      if (v < min) min = v;
      if (v > max) max = v;
    }
    const avg = sum / n;
    return {
      label,
      last: this._last.get(label) || 0,
      avg,
      min,
      max,
      samples: n,
    };
  }

  getReport({ sortBy = "avg", desc = true } = {}) {
    const out = [];
    for (const label of this._series.keys()) {
      const s = this.stats(label);
      if (s) out.push(s);
    }
    out.sort((a, b) => {
      const ka = a[sortBy] ?? 0;
      const kb = b[sortBy] ?? 0;
      return desc ? kb - ka : ka - kb;
    });
    return out;
  }
}

// Optional WebGL GPU timer query helper. Works with WebGL2 or EXT_disjoint_timer_query.
export function createWebGLTimer(renderer) {
  if (!renderer || typeof renderer.getContext !== "function") return null;
  const gl = renderer.getContext();
  if (!gl) return null;
  const isWebGL2 =
    typeof WebGL2RenderingContext !== "undefined" &&
    gl instanceof WebGL2RenderingContext;
  let ext = null;
  if (isWebGL2) {
    // In WebGL2, TIME_ELAPSED is core, disjoint is via EXT_disjoint_timer_query_webgl2
    ext = gl.getExtension("EXT_disjoint_timer_query_webgl2");
    if (!ext) return null;
  } else {
    ext = gl.getExtension("EXT_disjoint_timer_query");
    if (!ext) return null;
  }

  const queue = []; // { query }
  let active = null;

  function begin() {
    if (active) return; // avoid nesting
    if (isWebGL2) {
      const q = gl.createQuery();
      gl.beginQuery(ext.TIME_ELAPSED_EXT, q);
      active = { query: q };
    } else {
      const q = ext.createQueryEXT();
      ext.beginQueryEXT(ext.TIME_ELAPSED_EXT, q);
      active = { query: q };
    }
  }

  function end() {
    if (!active) return;
    if (isWebGL2) {
      gl.endQuery(ext.TIME_ELAPSED_EXT);
      queue.push(active);
    } else {
      ext.endQueryEXT(ext.TIME_ELAPSED_EXT);
      queue.push(active);
    }
    active = null;
  }

  // Returns ms for the oldest ready query, or null if not ready.
  function poll() {
    if (queue.length === 0) return null;
    const head = queue[0];
    if (isWebGL2) {
      const available = gl.getQueryParameter(
        head.query,
        gl.QUERY_RESULT_AVAILABLE
      );
      const disjoint = gl.getParameter(ext.GPU_DISJOINT_EXT);
      if (!available || disjoint) return null;
      const ns = gl.getQueryParameter(head.query, gl.QUERY_RESULT);
      gl.deleteQuery(head.query);
      queue.shift();
      return ns / 1e6; // ns -> ms
    }
    const available = ext.getQueryObjectEXT(
      head.query,
      ext.QUERY_RESULT_AVAILABLE_EXT
    );
    const disjoint = gl.getParameter(ext.GPU_DISJOINT_EXT);
    if (!available || disjoint) return null;
    const ns = ext.getQueryObjectEXT(head.query, ext.QUERY_RESULT_EXT);
    ext.deleteQueryEXT(head.query);
    queue.shift();
    return ns / 1e6;
  }

  // created timer (no logging)
  return { begin, end, poll };
}

// Global profiler instance for convenience
export const profiler = new FrameProfiler({ maxSamples: 240 });

// Expose profiler to window for easy debugging in the browser console
try {
  if (typeof window !== 'undefined') {
    // attach under a clearly-named property used for debugging
  window.__DAEMIOS_PROFILER = profiler;
    try {
      window.__DAEMIOS_PROFILER.rawGPU = () => {
        try {
          const g = profiler._gpu || null;
          if (!g) return { attached: false };
          return { attached: true, raw: g, hasPoll: typeof g.poll === 'function' };
        } catch (e) { return { error: String(e) } }
      }
    } catch (e) {}
  }
} catch (e) {
  // ignore
}
