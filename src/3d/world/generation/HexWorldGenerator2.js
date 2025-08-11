// Hex World Generator 2.0
// Implements the world_generation_2.0 spec with deterministic,
// per‑hex generation of elevation, climate and biomes.
// The algorithm favours map quality first while staying within a
// small noise budget so it can run on mobile devices.

import SimplexNoise from 'simplex-noise';

// --- Helper functions ----------------------------------------------------
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
  return () => {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    const t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    const r = (t + d) | 0;
    return (r >>> 0) / 4294967296;
  };
}
function makeRng(seed) {
  const seedStr = String(seed ?? 'world');
  const h = xmur3(seedStr);
  return sfc32(h(), h(), h(), h());
}

const SQRT3 = Math.sqrt(3);
function axialToPlane(q, r) {
  const x = 1.5 * q;
  const y = SQRT3 * (r + q / 2);
  return { x, y };
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
  return (h >>> 0) / 4294967296;
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

function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
function smoothstep(a, b, x) {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
}

// --- Classification ------------------------------------------------------
export const ElevationBand = {
  DeepOcean: 'DeepOcean',
  Shelf: 'Shelf',
  Coast: 'Coast',
  Lowland: 'Lowland',
  Highland: 'Highland',
  Mountain: 'Mountain',
  Peak: 'Peak',
};
export const TemperatureBand = {
  Polar: 'Polar', Cold: 'Cold', Temperate: 'Temperate', Tropical: 'Tropical',
};
export const MoistureBand = {
  Arid: 'Arid', SemiArid: 'SemiArid', Humid: 'Humid', Saturated: 'Saturated',
};

function classifyElevationBand(h) {
  if (h < 0.05) return ElevationBand.DeepOcean;
  if (h < 0.12) return ElevationBand.Shelf;
  if (h < 0.2) return ElevationBand.Coast;
  if (h < 0.45) return ElevationBand.Lowland;
  if (h < 0.7) return ElevationBand.Highland;
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

function pickBiome(elevBand, tBand, mBand) {
  if (elevBand === ElevationBand.DeepOcean) return 'DeepOcean';
  if (elevBand === ElevationBand.Shelf) return 'Shelf';
  if (elevBand === ElevationBand.Coast) return 'Coast';
  if (elevBand === ElevationBand.Mountain || elevBand === ElevationBand.Peak) return 'Mountain';
  // Land biomes
  if (tBand === TemperatureBand.Tropical) {
    if (mBand === MoistureBand.Saturated || mBand === MoistureBand.Humid) return 'Rainforest';
    if (mBand === MoistureBand.SemiArid) return 'Savanna';
    return 'Desert';
  }
  if (tBand === TemperatureBand.Temperate) {
    if (mBand === MoistureBand.Saturated || mBand === MoistureBand.Humid) return 'Forest';
    if (mBand === MoistureBand.SemiArid) return 'Steppe';
    return 'Desert';
  }
  if (tBand === TemperatureBand.Cold) {
    if (mBand === MoistureBand.Humid || mBand === MoistureBand.Saturated) return 'Taiga';
    return 'Tundra';
  }
  return 'PolarDesert';
}

// --- Generator -----------------------------------------------------------
export function createHexGenerator2(seed) {
  const rng = makeRng(seed);
  const continentNoise = new SimplexNoise(rng);
  const warpNoiseA = new SimplexNoise(rng);
  const warpNoiseB = new SimplexNoise(rng);
  const detailNoise = new SimplexNoise(rng);
  const moistureNoise = new SimplexNoise(rng);
  const tempNoise = new SimplexNoise(rng);
  const plateSeed = Math.floor(rng() * 1e9);

  let tuning = {
    continentScale: 1.0,
    warpScale: 1.0,
    warpStrength: 0.75,
    plateSize: 1.0,
    ridgeScale: 0.85,
    detailScale: 1.0,
    climateScale: 1.0,
    oceanEncapsulation: 0.75,
    seaBias: 0.0,
  };

  function setTuning(t) { tuning = { ...tuning, ...(t || {}) }; }

  function get(q, r) {
    const { x, y } = axialToPlane(q, r);
    const macroScale = 0.0012 * tuning.continentScale;
    let nx = x * macroScale;
    let ny = y * macroScale;

    const warpA = warpNoiseA.noise2D(nx * 0.5 * tuning.warpScale, ny * 0.5 * tuning.warpScale);
    const warpB = warpNoiseB.noise2D(nx * 2 * tuning.warpScale, ny * 2 * tuning.warpScale);
    nx += warpA * 250 * tuning.warpStrength;
    ny += warpB * 250 * tuning.warpStrength;

    const base = continentNoise.noise2D(nx, ny); // [-1,1]
    const plate = worley2F12(nx, ny, 800 * tuning.plateSize, plateSeed);
    const ridge = clamp01((plate.f2 - plate.f1) / (40 * tuning.ridgeScale));
    const detail = detailNoise.noise2D(nx * 8 * tuning.detailScale, ny * 8 * tuning.detailScale);

    let h = base * 0.6 + ridge * 0.4 + detail * 0.1;
    h = (h + 1) / 2; // 0..1

    const seaLevel = 0.52 + tuning.seaBias;
    if (h < seaLevel) {
      h = h * (1 - tuning.oceanEncapsulation) + seaLevel * tuning.oceanEncapsulation;
    } else {
      const d = h - seaLevel;
      h = seaLevel + d * (1 + tuning.oceanEncapsulation * 0.5);
    }
    h = clamp01(h);

    // Slope estimation from detail variations
    const eps = 0.001;
    const dx = detailNoise.noise2D(nx * 8 + eps, ny * 8) - detail;
    const dy = detailNoise.noise2D(nx * 8, ny * 8 + eps) - detail;
    const slope = clamp01(Math.hypot(dx, dy) * 2);

    // Climate
    const lat = clamp01((r + 2048) / 4096); // approximate normalized latitude
    let temp = 0.5 + tempNoise.noise2D(nx * 0.5 * tuning.climateScale, ny * 0.5 * tuning.climateScale) * 0.25;
    temp = clamp01(temp * (1 - Math.abs(lat - 0.5)) * 1.6);
    let moisture = 0.5 + moistureNoise.noise2D(nx * 0.6 * tuning.climateScale, ny * 0.6 * tuning.climateScale) * 0.3;
    moisture = clamp01(moisture);

    const elevBand = classifyElevationBand(h);
    const tBand = classifyTemperatureBand(temp);
    const mBand = classifyMoistureBand(moisture);
    const biomeMajor = pickBiome(elevBand, tBand, mBand);

    return {
      q, r,
      elevationBand: elevBand,
      temperatureBand: tBand,
      moistureBand: mBand,
      biomeMajor,
      fields: {
        h,
        moisture,
        temp,
        ridge,
      },
      flags: { isLand: h >= seaLevel },
      render: {
        aridityTint: 1 - moisture,
        snowMask: clamp01(1 - temp),
        rockExposure: slope,
        bathymetryStep: h < seaLevel ? h / seaLevel : 0,
      },
    };
  }

  return { get, setTuning };
}

export default { createHexGenerator2 };
