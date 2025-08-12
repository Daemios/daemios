// Hex World Generator 2.0
// Implements the layered deterministic terrain system described in
// docs/world_generation_2.0.md.  Each hex is generated as a pure
// function of (seed, q, r) with a tight noise budget suitable for
// mobile clients.

import SimplexNoise from 'simplex-noise';

// ---- utility helpers ----------------------------------------------------
function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i += 1) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}
function sfc32(a, b, c, d) {
  let aa = a; let bb = b; let cc = c; let dd = d;
  return () => {
    aa >>>= 0; bb >>>= 0; cc >>>= 0; dd >>>= 0;
    const t = (aa + bb) | 0;
    aa = bb ^ (bb >>> 9);
    bb = (cc + (cc << 3)) | 0;
    cc = (cc << 21) | (cc >>> 11);
    dd = (dd + 1) | 0;
    const r = (t + dd) | 0;
    return (r >>> 0) / 4294967296;
  };
}
function makeRng(seed) {
  const h = xmur3(String(seed));
  return sfc32(h(), h(), h(), h());
}

function hash2i(x, y, seed) {
  let a = (x | 0) * 374761393 + (seed | 0) * 668265263; a |= 0;
  let b = (y | 0) * 1274126177 + 974711; b |= 0;
  a ^= a << 13; a ^= a >>> 17; a ^= a << 5;
  b ^= b << 13; b ^= b >>> 17; b ^= b << 5;
  const c = (a + b) | 0;
  return c ^ (c >>> 16);
}
function hashFloat01(x, y, seed) {
  const h = hash2i(x, y, seed);
  return ((h >>> 0) / 4294967296);
}

const SQRT3 = Math.sqrt(3);
function axialToPlane(q, r) {
  return { x: 1.5 * q, y: SQRT3 * (r + q / 2) };
}

function worley2F12(x, y, cellSize, seed) {
  const cx = Math.floor(x / cellSize);
  const cy = Math.floor(y / cellSize);
  let f1 = Infinity; let f2 = Infinity; let id1 = 0;
  for (let j = -1; j <= 1; j += 1) {
    for (let i = -1; i <= 1; i += 1) {
      const gx = cx + i; const gy = cy + j;
      const rx = hashFloat01(gx, gy, seed);
      const ry = hashFloat01(gx ^ 0x9e3779b9, gy ^ 0x85ebca6b, seed ^ 0xc2b2ae35);
      const px = (gx + rx) * cellSize;
      const py = (gy + ry) * cellSize;
      const dx = px - x; const dy = py - y;
      const d = Math.hypot(dx, dy);
      if (d < f1) { f2 = f1; f1 = d; id1 = hash2i(gx, gy, seed); }
      else if (d < f2) { f2 = d; }
    }
  }
  return { f1, f2, id: id1 };
}

function ridged(n) { return 1 - Math.abs(n); }
function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }

// ---- classification enums ----------------------------------------------
export const ElevationBand = {
  DeepOcean: 'DeepOcean', Shelf: 'Shelf', Coast: 'Coast', Lowland: 'Lowland', Highland: 'Highland', Mountain: 'Mountain', Peak: 'Peak',
};
export const TemperatureBand = { Polar: 'Polar', Cold: 'Cold', Temperate: 'Temperate', Tropical: 'Tropical' };
export const MoistureBand = { Arid: 'Arid', SemiArid: 'SemiArid', Humid: 'Humid', Saturated: 'Saturated' };

function classifyElevationBand(h) {
  if (h < 0.05) return ElevationBand.DeepOcean;
  if (h < 0.12) return ElevationBand.Shelf;
  if (h < 0.20) return ElevationBand.Coast;
  if (h < 0.45) return ElevationBand.Lowland;
  if (h < 0.70) return ElevationBand.Highland;
  if (h < 0.88) return ElevationBand.Mountain;
  return ElevationBand.Peak;
}
function classifyTemperatureBand(t) {
  if (t < 0.12) return TemperatureBand.Polar;
  if (t < 0.32) return TemperatureBand.Cold;
  if (t < 0.78) return TemperatureBand.Temperate;
  return TemperatureBand.Tropical;
}
function classifyMoistureBand(m) {
  if (m < 0.22) return MoistureBand.Arid;
  if (m < 0.45) return MoistureBand.SemiArid;
  if (m < 0.72) return MoistureBand.Humid;
  return MoistureBand.Saturated;
}

export const RegionArchetype = {
  Megaplain: 'Megaplain', Badlands: 'Badlands', HighPlateau: 'HighPlateau', BrokenHighlands: 'BrokenHighlands', Basin: 'Basin', InlandRidge: 'InlandRidge', CoastalShelf: 'CoastalShelf',
};
function chooseRegionArchetype(cellId) {
  const vals = Object.values(RegionArchetype);
  return vals[Math.abs(cellId) % vals.length];
}

function pickBiome(elevBand, tBand, mBand) {
  if (elevBand === ElevationBand.DeepOcean) return 'DeepOcean';
  if (elevBand === ElevationBand.Shelf) return 'Shelf';
  if (elevBand === ElevationBand.Coast) return 'Coast';
  if (elevBand === ElevationBand.Mountain || elevBand === ElevationBand.Peak) return 'Mountain';
  if (tBand === TemperatureBand.Tropical) {
    if (mBand === MoistureBand.Arid) return 'Desert';
    if (mBand === MoistureBand.SemiArid) return 'Savanna';
    return 'Rainforest';
  }
  if (tBand === TemperatureBand.Temperate) {
    if (mBand === MoistureBand.Arid) return 'Desert';
    if (mBand === MoistureBand.SemiArid) return 'Steppe';
    return 'Forest';
  }
  if (tBand === TemperatureBand.Cold) {
    if (mBand === MoistureBand.Arid) return 'Tundra';
    return 'Taiga';
  }
  return 'Polar';
}

// ---- generator ---------------------------------------------------------
const defaultConfig = {
  macro: { freq: 0.008, seaLevel: 0.52, encapsulation: 1.0 },
  warp: { slow: { freq: 0.001, amp: 0.25 }, fast: { freq: 0.05, amp: 0.08 } },
  plates: { cellSize: 80, ridgeFreq: 0.1, ridgeAmp: 0.45 },
  detail: { freq: 0.6, amp: 0.15 },
  region: { cellSize: 120 },
  moisture: { freq: 0.05 },
  special: { freq: 0.02 },
};

function merge(target, src) {
  const out = { ...target };
  for (const k in src) {
    if (src[k] && typeof src[k] === 'object' && !Array.isArray(src[k])) {
      out[k] = merge(out[k] || {}, src[k]);
    } else {
      out[k] = src[k];
    }
  }
  return out;
}

export function createHexGenerator2(seed, tuning = {}) {
  let cfg = merge(defaultConfig, tuning);
  const rng = makeRng(seed);
  const warpSlow = new SimplexNoise(() => rng());
  const warpFast = new SimplexNoise(() => rng());
  const macroNoise = new SimplexNoise(() => rng());
  const plateNoise = new SimplexNoise(() => rng());
  const detailNoise = new SimplexNoise(() => rng());
  const moistureNoise = new SimplexNoise(() => rng());
  const specialNoise = new SimplexNoise(() => rng());

  function get(q, r) {
    const { x: ax, y: ay } = axialToPlane(q, r);
    // layer 1: domain warp
    const wx = warpSlow.noise2D(ax * cfg.warp.slow.freq, ay * cfg.warp.slow.freq) * cfg.warp.slow.amp
      + warpFast.noise2D(ax * cfg.warp.fast.freq, ay * cfg.warp.fast.freq) * cfg.warp.fast.amp;
    const wy = warpSlow.noise2D((ax + 100) * cfg.warp.slow.freq, (ay + 100) * cfg.warp.slow.freq) * cfg.warp.slow.amp
      + warpFast.noise2D((ax + 100) * cfg.warp.fast.freq, (ay + 100) * cfg.warp.fast.freq) * cfg.warp.fast.amp;
    const px = ax + wx;
    const py = ay + wy;

    // macro continents
    const macro = macroNoise.noise2D(px * cfg.macro.freq, py * cfg.macro.freq);

    // plate field
    const plate = worley2F12(px, py, cfg.plates.cellSize, seed);
    const distEdge = clamp01((plate.f2 - plate.f1) / cfg.plates.cellSize);
    const ridge = ridged(plateNoise.noise2D(px * cfg.plates.ridgeFreq, py * cfg.plates.ridgeFreq)) * (1 - distEdge);

    // detail
    const detail = detailNoise.noise2D(px * cfg.detail.freq, py * cfg.detail.freq) * cfg.detail.amp;

    // encapsulation / normalization
    let elev = macro + ridge * cfg.plates.ridgeAmp + detail;
    elev += cfg.macro.encapsulation * (macro - cfg.macro.seaLevel);
    elev = (elev + 1) / 2; // normalize to 0..1
    elev = clamp01(elev);

    // layer 2: regional bias
    const regionCell = worley2F12(px, py, cfg.region.cellSize, seed ^ 0x5f3759df);
    const archetype = chooseRegionArchetype(regionCell.id);
    let bias = 0;
    switch (archetype) {
      case RegionArchetype.Megaplain: bias -= 0.05; break;
      case RegionArchetype.Badlands: bias += 0.03; break;
      case RegionArchetype.HighPlateau: bias += 0.08; break;
      case RegionArchetype.Basin: bias -= 0.08; break;
      case RegionArchetype.InlandRidge: bias += 0.05 * (1 - distEdge); break;
      default: break;
    }
    elev = clamp01(elev + bias);

    // climate fields
    const lat = clamp01((r + 256) / 512);
    let temp = 1 - Math.abs(lat - 0.5) * 2;
    temp *= 1 - elev * 0.6; // lapse rate
    temp = clamp01(temp);
    const moisture = clamp01(moistureNoise.noise2D(px * cfg.moisture.freq, py * cfg.moisture.freq) * 0.5 + 0.5);

    const tBand = classifyTemperatureBand(temp);
    const mBand = classifyMoistureBand(moisture);
    const elevBand = classifyElevationBand(elev);

    const biomeMajor = pickBiome(elevBand, tBand, mBand);

    return {
      biomeMajor,
      elevationBand: elevBand,
      temperatureBand: tBand,
      moistureBand: mBand,
      region: archetype,
      fields: {
        h: elev,
        temp,
        moisture,
        ridge: 1 - distEdge,
        special: specialNoise.noise2D(px * cfg.special.freq, py * cfg.special.freq),
      },
    };
  }

  function setTuning(t) { cfg = merge(cfg, t || {}); }

  return { get, setTuning };
}

export default createHexGenerator2;
