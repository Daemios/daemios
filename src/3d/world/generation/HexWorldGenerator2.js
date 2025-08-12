// Hex World Generator 2.0
// Implements the layered approach described in docs/world_generation_2.0.md.
// Deterministic per-tile generation with a small noise budget.

import SimplexNoise from 'simplex-noise';

// ---- math helpers ----
const SQRT3 = Math.sqrt(3);
function axialToPlane(q, r) {
  return { x: 1.5 * q, y: SQRT3 * (r + q / 2) };
}
function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
function fbm(noise, x, y, freq, octaves = 4) {
  let amp = 1; let sum = 0; let div = 0; let f = freq;
  for (let i = 0; i < octaves; i += 1) {
    sum += noise.noise2D(x * f, y * f) * amp;
    div += amp;
    f *= 2;
    amp *= 0.5;
  }
  return sum / div; // [-1,1]
}
function ridged(n) { return 1 - Math.abs(n); }

// ---- classification enums ----
export const ElevationBand = {
  DeepOcean: 'DeepOcean', Shelf: 'Shelf', Coast: 'Coast',
  Lowland: 'Lowland', Highland: 'Highland', Mountain: 'Mountain', Peak: 'Peak',
};
export const TemperatureBand = {
  Polar: 'Polar', Cold: 'Cold', Temperate: 'Temperate', Tropical: 'Tropical',
};
export const MoistureBand = {
  Arid: 'Arid', SemiArid: 'SemiArid', Humid: 'Humid', Saturated: 'Saturated',
};
const ElevationThresholds = { deep: 0.05, shelf: 0.12, coast: 0.20, low: 0.45, high: 0.70, mount: 0.88 };
function classifyElevationBand(h) {
  if (h < ElevationThresholds.deep) return ElevationBand.DeepOcean;
  if (h < ElevationThresholds.shelf) return ElevationBand.Shelf;
  if (h < ElevationThresholds.coast) return ElevationBand.Coast;
  if (h < ElevationThresholds.low) return ElevationBand.Lowland;
  if (h < ElevationThresholds.high) return ElevationBand.Highland;
  if (h < ElevationThresholds.mount) return ElevationBand.Mountain;
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

// extremely lightweight biome selector – enough for rendering
function pickBiomeMajor({ elevBand, tBand, mBand }) {
  if (elevBand === ElevationBand.DeepOcean) return 'DeepOcean';
  if (elevBand === ElevationBand.Shelf) return 'Shelf';
  if (elevBand === ElevationBand.Coast) return 'Coast';
  if (elevBand === ElevationBand.Mountain || elevBand === ElevationBand.Peak) return 'Alpine';
  if (tBand === TemperatureBand.Tropical) {
    return mBand === MoistureBand.Arid ? 'Desert' : 'Tropical';
  }
  if (tBand === TemperatureBand.Temperate) {
    return mBand === MoistureBand.Arid ? 'Steppe' : 'Temperate';
  }
  if (tBand === TemperatureBand.Cold) {
    return mBand === MoistureBand.Arid ? 'Tundra' : 'Boreal';
  }
  return 'Polar';
}

export function createHexGenerator2(seed) {
  const simplex = new SimplexNoise(String(seed || 'world'));
  const seaLevel = 0.52;

  function get(q, r) {
    // ---- Layer 1: macro continents ----
    const { x, y } = axialToPlane(q, r);
    const warpSlow = simplex.noise2D(x * 0.08, y * 0.08) * 0.25;
    const warpFast = simplex.noise2D(x * 0.5, y * 0.5) * 0.05;
    const wx = x + warpSlow + warpFast;
    const wy = y + warpSlow + warpFast;
    const continental = fbm(simplex, wx, wy, 0.003) ;
    const plates = simplex.noise2D(wx * 0.02 + 100, wy * 0.02 + 100); // proxy for plate edges
    const ridge = ridged(plates);
    const detail = simplex.noise2D(wx * 0.1 + 200, wy * 0.1 + 200) * 0.15;
    let h = continental * 0.6 + detail - ridge * 0.25; // [-1,1]
    h = (h + 1) / 2; // 0..1
    // push oceans down / land up around sea level
    h = (h - seaLevel) * 0.9 + seaLevel;
    h = clamp01(h);

    // ---- Climate fields ----
    const lat01 = clamp01((r + 512) / 1024); // simple latitude proxy
    let temp = 1 - Math.abs(lat01 - 0.5) * 2; // equator hot
    temp -= h * 0.3; // lapse rate with altitude
    temp = clamp01(temp);
    let moisture = fbm(simplex, wx + 300, wy + 300, 0.05) * 0.5 + 0.5;
    moisture = clamp01(moisture);

    // ---- Layer classification ----
    const elevationBand = classifyElevationBand(h);
    const temperatureBand = classifyTemperatureBand(temp);
    const moistureBand = classifyMoistureBand(moisture);
    const biomeMajor = pickBiomeMajor({ elevBand: elevationBand, tBand: temperatureBand, mBand: moistureBand });

    // minimal render hints
    const render = {
      snowMask: clamp01(1 - temp),
      rockExposure: ridge,
      aridityTint: 1 - moisture,
      bathymetryStep: elevationBand === ElevationBand.DeepOcean ? (ElevationThresholds.deep - h) / ElevationThresholds.deep : 0,
    };

    return {
      fields: { h, temp, moisture, ridge },
      elevationBand,
      temperatureBand,
      moistureBand,
      biomeMajor,
      biomeSub: null,
      render,
      flags: {},
    };
  }

  return { get };
}

export default { createHexGenerator2 };
