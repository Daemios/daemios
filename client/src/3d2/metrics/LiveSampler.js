// Lightweight live sampler for 3d2 scenes
// Non-allocating ring buffer for samples (stores primitives only)
export class LiveSampler {
  constructor({ maxSamples = 10000, sampleEvery = 1 } = {}) {
    this.max = Math.max(128, maxSamples);
    this.sampleEvery = Math.max(1, sampleEvery);
    this.idx = 0;
    this.count = 0;
    this.frameCounter = 0;
    this.samples = new Array(this.max);
    this.running = false;
    this._cb = null; // optional per-sample callback
    this._lastT = 0;
    this._gpu = null;
  }

  start() {
    this.running = true;
    this._lastT = performance.now();
  }

  stop() {
    this.running = false;
  }

  clear() {
    this.idx = 0;
    this.count = 0;
    this.frameCounter = 0;
    for (let i = 0; i < this.max; i++) this.samples[i] = undefined;
  }

  onSample(cb) {
    this._cb = cb;
  }

  // call from RAF loop after scene.render
  sampleFrame({ renderMs = null, info = {}, layers = {}, gpuMs = null } = {}) {
    if (!this.running) return;
    this.frameCounter += 1;
    if ((this.frameCounter % this.sampleEvery) !== 0) return;

    const t = performance.now();
    const frameMs = t - this._lastT;
    this._lastT = t;

    const s = {
      t,
      frameMs: Math.round(frameMs * 1000) / 1000,
      renderMs: renderMs == null ? null : Math.round(renderMs * 1000) / 1000,
      calls: info.calls || 0,
      tris: info.triangles || 0,
      points: info.points || 0,
      layers: layers || {},
      gpuMs: gpuMs == null ? null : Math.round(gpuMs * 1000) / 1000,
    };

    this.samples[this.idx] = s;
    this.idx = (this.idx + 1) % this.max;
    this.count = Math.min(this.max, this.count + 1);

    if (this._cb) {
      try { this._cb(s); } catch (e) { /* ignore */ }
    }
  }

  snapshot() {
    const out = [];
    for (let i = 0; i < this.count; i++) {
      const p = (this.idx - this.count + i + this.max) % this.max;
      out.push(this.samples[p]);
    }
    return out;
  }

  summary() {
    const arr = this.snapshot();
    if (!arr.length) return null;
    const frameMs = arr.map((s) => s.frameMs || 0);
    const stats = (xs) => {
      const n = xs.length;
      if (!n) return null;
      const sum = xs.reduce((a,b)=>a+b,0);
      const avg = sum / n;
      const sorted = xs.slice().sort((a,b)=>a-b);
      const p = (p)=>{
        const idx = Math.floor((p/100) * (n-1));
        return sorted[Math.max(0, Math.min(n-1, idx))];
      };
      const sq = xs.reduce((acc,x)=>acc+((x-avg)*(x-avg)),0);
      const std = Math.sqrt(sq / n);
      return { avg, min: sorted[0], max: sorted[n-1], median: p(50), p90: p(90), p99: p(99), std };
    };
    return {
      frames: arr.length,
      frameMs: stats(frameMs),
      calls: stats(arr.map(s=>s.calls||0)),
      tris: stats(arr.map(s=>s.tris||0)),
    };
  }
}
