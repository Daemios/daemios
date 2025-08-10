// Mobile-friendly, stateless hex world generator
// Deterministic: each hex result is a pure function of (seed, q, r)
// Noise budget: ~8–10 samples per hex; no neighbor loops
// Exports:
// - createHexGenerator(seed): returns { get(q, r) } that computes a record per spec
// - computeHex(seed, q, r): convenience wrapper (instantiates generator once per call; heavier)

import SimplexNoise from 'simplex-noise';

// --- Helpers: hashing & PRNG (deterministic in JS number space) ---
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
// Hash to int
function hash2i(x, y, seed) {
  // 2D integer hash (Thomas Wang-like)
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

// Axial (q,r) -> 2D plane (x,y) in flat-top layout with R=1
const SQRT3 = Math.sqrt(3);
function axialToPlane(q, r) {
  const x = 1.5 * q;
  const y = SQRT3 * (r + q / 2);
  return { x, y };
}

// Worley (cellular) distance to closest and 2nd closest feature points in 3x3 neighborhood
function worley2F12(x, y, cellSize, seed) {
  const cx = Math.floor(x / cellSize);
  const cy = Math.floor(y / cellSize);
  let f1 = Infinity; let f2 = Infinity;
  let id1 = 0;
  for (let j = -1; j <= 1; j += 1) {
    for (let i = -1; i <= 1; i += 1) {
      const gx = cx + i; const gy = cy + j;
      // Random feature point in this grid cell
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
  return { f1, f2, id: id1, cell: { x: cx, y: cy } };
}

// Ridge transform from value noise in [-1,1]
function ridged(n) { return 1 - Math.abs(n); }
function smoothstep(a, b, x) { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }

// Bands and enums
export const ElevationBand = {
  DeepOcean: 'DeepOcean', Ocean: 'Ocean', Shelf: 'Shelf', Coast: 'Coast', Lowland: 'Lowland', Highland: 'Highland', Mountain: 'Mountain', Peak: 'Peak',
};
export const TemperatureBand = { Polar: 'Polar', Cold: 'Cold', Temperate: 'Temperate', Tropical: 'Tropical' };
export const MoistureBand = { Arid: 'Arid', SemiArid: 'SemiArid', Humid: 'Humid', Saturated: 'Saturated' };

const ElevationThresholds = {
  // Sharper contrast per design doc v1.1
  // Deep ocean expanded, open seas wider, more interior highlands/mountains
  deep: 0.05,
  ocean: 0.08,
  shelf: 0.12,
  coast: 0.20,
  low: 0.45,
  high: 0.70,
  mount: 0.88,
};

function classifyElevationBand(h) {
  if (h < ElevationThresholds.deep) return ElevationBand.DeepOcean;
  if (h < ElevationThresholds.ocean) return ElevationBand.Ocean;
  if (h < ElevationThresholds.shelf) return ElevationBand.Shelf;
  if (h < ElevationThresholds.coast) return ElevationBand.Coast;
  if (h < ElevationThresholds.low) return ElevationBand.Lowland;
  if (h < ElevationThresholds.high) return ElevationBand.Highland;
  if (h < ElevationThresholds.mount) return ElevationBand.Mountain;
  return ElevationBand.Peak;
}
function classifyTemperatureBand(t) {
  // t in [0,1]: 0 polar .. 1 tropical
  // Warmer world: shrink Polar/Cold ranges and expand Temperate/Tropical
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

// Archetypes
export const Archetype = {
  EquatorialWet: 'EquatorialWet', SubtropicalDryWest: 'SubtropicalDryWest', SubtropicalMonsoonEast: 'SubtropicalMonsoonEast',
  TemperateMaritime: 'TemperateMaritime', TemperateContinental: 'TemperateContinental', BorealPolar: 'BorealPolar',
};

function chooseArchetype(cellId, lat01) {
  // Bias by latitude
  if (lat01 < 0.18) return Archetype.BorealPolar;
  if (lat01 > 0.82) return Archetype.EquatorialWet;
  const roll = (cellId >>> 0) % 6;
  switch (roll) {
    case 0: return Archetype.SubtropicalDryWest;
    case 1: return Archetype.SubtropicalMonsoonEast;
    case 2: return Archetype.TemperateMaritime;
    case 3: return Archetype.TemperateContinental;
    case 4: return lat01 > 0.6 ? Archetype.EquatorialWet : Archetype.TemperateMaritime;
    default: return lat01 < 0.35 ? Archetype.BorealPolar : Archetype.TemperateContinental;
  }
}

// Biome chooser (major) matrix with elevation gating
function pickBiomeMajor({ elevBand, tBand, mBand, slope, isCoast, shelfKind, coldness, archetype }) {
  // Oceans & coasts
  if (elevBand === ElevationBand.DeepOcean) return 'DeepOcean';
  if (elevBand === ElevationBand.Shelf) return shelfKind; // CoralSea / KelpShelf / IceMarginalSea
  if (elevBand === ElevationBand.Coast) {
    if (coldness > 0.65 && slope > 0.65) return 'FjordCoast';
    if (tBand === TemperatureBand.Tropical && (mBand === MoistureBand.Humid || mBand === MoistureBand.Saturated) && slope < 0.35) return 'MangroveCoast';
    return slope > 0.55 ? 'RockyCoast' : 'SandyCoast';
  }

  // Elevation gating for mountains
  if (elevBand === ElevationBand.Mountain || elevBand === ElevationBand.Peak) {
    if (coldness > 0.8 || elevBand === ElevationBand.Peak) return 'SnowIce';
    if (slope > 0.65) return 'BareRockScree';
    return 'AlpineMeadow';
  }

  // Bias modifiers by archetype
  const dryBias = (archetype === Archetype.SubtropicalDryWest || archetype === Archetype.TemperateContinental) ? 1 : 0;
  const wetBias = (archetype === Archetype.EquatorialWet || archetype === Archetype.TemperateMaritime || archetype === Archetype.SubtropicalMonsoonEast) ? 1 : 0;

  // Temperate/Tropical/Cold bands
  if (tBand === TemperatureBand.Tropical) {
    if (mBand === MoistureBand.Saturated || (mBand === MoistureBand.Humid && wetBias)) return 'Rainforest';
    if (mBand === MoistureBand.Humid) return 'SeasonalForest';
    if (mBand === MoistureBand.SemiArid) return 'Savanna';
    return 'DesertFringe';
  }
  if (tBand === TemperatureBand.Temperate) {
    if (mBand === MoistureBand.Saturated || (mBand === MoistureBand.Humid && wetBias)) return 'TemperateForest';
    if (mBand === MoistureBand.Humid) return 'Prairie';
    if (mBand === MoistureBand.SemiArid || dryBias) return 'SteppeShrubland';
    return 'ColdDesertSteppe';
  }
  if (tBand === TemperatureBand.Cold) {
    if (mBand === MoistureBand.Saturated && slope < 0.35) return 'BorealWetlandBog';
    if (mBand === MoistureBand.Humid) return 'Taiga';
    if (mBand === MoistureBand.SemiArid) return 'ColdSteppe';
    return 'PolarDesert';
  }
  // Polar (tBand === Polar)
  return mBand === MoistureBand.Arid ? 'PolarDesert' : 'Tundra';
}

function pickBiomeSub({ major, slope, relief, archetype, tBand }) {
  switch (major) {
    case 'Rainforest': return relief > 0.6 && tBand === TemperatureBand.Tropical ? 'CloudForest' : 'LowlandRainforest';
    case 'TemperateForest': return relief > 0.55 ? 'MixedForest' : 'BroadleafForest';
    case 'Savanna': return relief > 0.5 ? 'DrySavanna' : 'MoistSavanna';
    case 'SteppeShrubland': return slope > 0.55 ? 'RockySteppe' : 'PrairieSteppe';
    case 'DesertFringe': return slope < 0.35 ? 'ErgDunes' : (relief > 0.55 ? 'RockyMesa' : 'RegGravel');
    case 'ColdDesertSteppe': return relief > 0.6 ? 'BadlandsScree' : 'ColdSteppe';
    case 'Taiga': return relief > 0.55 ? 'MountainTaiga' : 'LowlandTaiga';
    case 'BorealWetlandBog': return 'PeatBog';
    case 'AlpineMeadow': return relief > 0.65 ? 'Subalpine' : 'Montane';
    case 'BareRockScree': return 'Scree';
    case 'SnowIce': return 'Glacier';
    case 'SandyCoast': return 'BarrierLagoon';
    case 'RockyCoast': return 'CliffCoast';
    case 'FjordCoast': return 'DeepFjord';
    case 'MangroveCoast': return 'TidalMangrove';
    case 'DeepOcean': return 'Abyssal';
    case 'CoralSea': return 'BarrierReef';
    case 'KelpShelf': return 'BankedKelp';
    case 'IceMarginalSea': return 'PackIce';
    default: return 'Generic';
  }
}

function makeNoises(seed) {
  // Create core noise instances with stable sub-seeds
  const rng = makeRng(seed);
  const s1 = Math.floor(rng() * 1e9).toString();
  const s2 = Math.floor(rng() * 1e9).toString();
  const s3 = Math.floor(rng() * 1e9).toString();
  const s4 = Math.floor(rng() * 1e9).toString();
  return {
    warpX: new SimplexNoise('warpX:' + s1),
    warpY: new SimplexNoise('warpY:' + s2),
    base: new SimplexNoise('base:' + s3),
    ridge: new SimplexNoise('ridge:' + s4),
    detail: new SimplexNoise('detail:' + s2 + ':' + s1),
  };
}

export function createHexGenerator(seed) {
  const noises = makeNoises(seed);
  const seedInt = hash2i(0x9e37, 0x85eb, 0xc2b2 ^ (hash2i(13, 17, String(seed).length)));
  // Global parameters (tuned to hex axial-space units with R=1); converted to mutable w/ tuning
  let cellSize = 140; // plate/cell size in hex units (typical 100–300 diameter)
  let warpFreq = 0.004, warpAmp = 80; // domain warp for bold coasts
  let baseFreq = 0.0065, baseShape = 1.5; // continental interiors contrast
  let ridgeFreq = 0.016; // mountain chains
  let detailFreq = 0.045, detailAmp = 0.18; // breakup
  let latPeriod = 900; // climate belt half-period in axial-plane units
  const lapseRate = 0.55; // slightly warmer highlands; reduce over-cold bias
  // Sea coverage controls (pure arithmetic, no extra noise)
  let oceanEncapsulation = 0.75; // 0..1 strength: push oceans down, land up using continental mask
  let seaBias = 0.0; // positive shifts sea level up (more water); negative less water

  // Optional runtime tuning (all multipliers default 1.0)
  let tuning = {
    continentScale: 1.0, // multiplies baseFreq
    warpScale: 1.0,      // multiplies warpFreq
    warpStrength: 1.0,   // multiplies warpAmp
    plateSize: 1.0,      // multiplies cellSize
    ridgeScale: 1.0,     // multiplies ridgeFreq
    detailScale: 1.0,    // multiplies detailFreq
    climateScale: 1.0,   // multiplies latPeriod
    // New: sea/ocean controls
    oceanEncapsulation: undefined, // optional override of oceanEncapsulation 0..1
    seaBias: undefined,            // optional shift in [~ -0.3 .. 0.3], positive => more water
  };
  function applyTuning() {
  const nz = (v, d=1)=> (v==null || !isFinite(v) || v===0 ? d : v);
  baseFreq = 0.0065 * nz(tuning.continentScale, 1);
  warpFreq = 0.004 * nz(tuning.warpScale, 1);
  warpAmp = 80 * nz(tuning.warpStrength, 1);
  cellSize = Math.max(10, 140 * nz(tuning.plateSize, 1)); // keep above tiny to avoid artifacts
  ridgeFreq = 0.016 * nz(tuning.ridgeScale, 1);
  detailFreq = 0.045 * nz(tuning.detailScale, 1);
  latPeriod = Math.max(50, 900 * nz(tuning.climateScale, 1));
  if (tuning.oceanEncapsulation != null && isFinite(tuning.oceanEncapsulation)) {
    oceanEncapsulation = Math.max(0, Math.min(1, tuning.oceanEncapsulation));
  }
  if (tuning.seaBias != null && isFinite(tuning.seaBias)) {
    // Clamp conservatively; applied as a direct shift on h
    seaBias = Math.max(-0.35, Math.min(0.35, tuning.seaBias));
  }
  }
  applyTuning();

  // Seed-rotated latitude axis
  const rng = makeRng('latAxis:' + seed);
  const ang = rng() * Math.PI * 2;
  const latAxis = { x: Math.cos(ang), y: Math.sin(ang) };
  const lonAxis = { x: -latAxis.y, y: latAxis.x };

  function simplex2(noise, x, y, f) { return noise.noise2D(x * f, y * f); }
  function n01(noise, x, y, f) { return 0.5 * (simplex2(noise, x, y, f) + 1); }

  function elevationAt(x, y) {
    // Domain warp
    const wx = simplex2(noises.warpX, x, y, warpFreq) * warpAmp;
    const wy = simplex2(noises.warpY, x, y, warpFreq) * warpAmp;
    const xw = x + wx; const yw = y + wy;

    // Continental base: low-frequency simplex blend for blob-like continents (2 calls total)
  const cont1 = n01(noises.base, xw, yw, baseFreq);
  const cont2 = n01(noises.base, xw, yw, baseFreq * 0.45);
  let cont = Math.pow(clamp01(cont1 * 0.70 + cont2 * 0.30), baseShape * 0.95);

    // Cellular plates and ridge gating (no extra noise calls aside from ridge)
    const w = worley2F12(xw, yw, cellSize, seedInt);
    const edge = clamp01((w.f2 - w.f1) / (cellSize * 0.8)); // 0 near edge, 1 deep in cell
    const edgeInv = 1 - smoothstep(0.0, 0.33, edge); // 1 near plate edges

    // Ridged term shaped & gated to edges (1 call)
  const ridgeN = ridged(simplex2(noises.ridge, xw, yw, ridgeFreq));
  let ridgeTerm = ridgeN * edgeInv;

    // Small detail (1 call)
  let small = n01(noises.detail, x, y, detailFreq) * detailAmp;

    // Combine and normalize
    // Continental relief bias: push interiors up, basins down
    const macroBias = (cont - 0.5) * 0.25;
  // Land potential: continental field plus plate interior distance
  const plateInterior = smoothstep(0.18, 0.86, edge); // 0 near edges, 1 deep within
  const landPotential = clamp01(cont * 0.70 + plateInterior * 0.30);
  // Chunky land from land potential (wider mid-band)
  const landMaskCore = smoothstep(0.46, 0.58, landPotential);
  // Snaking seas: carve meandering corridors along plate boundaries (edgeInv ~1 near edges)
    // Snaking seas: carve wide corridors along plate boundaries (edgeInv ~1 near edges)
  const seaCorridor = smoothstep(0.45, 0.90, edgeInv);
  // Oceans are primarily corridors through land with reduced base-ocean weight
  let oceanMask = clamp01((1 - landMaskCore) * 0.38 + seaCorridor * landMaskCore * 1.20);
  const landMask = 1 - oceanMask;
  // Sharply reduce ridge/detail prominence under oceans to avoid island chains; keep ridges inland
  ridgeTerm *= (0.18 + 0.82 * landMask);
  small *= (0.60 + 0.40 * landMask);
  // Interior lift to puff up continental cores
  const interiorLift = landMask * edge * 0.10;
  // Compose separate ocean and land baselines then blend by mask
  const corridorDepth = seaCorridor * landMaskCore; // deepen where corridors cut land
  const hOcean = cont * 0.55 + small * 0.65 - oceanMask * 0.05 - corridorDepth * 0.12; // deeper along corridors
  const hLand = cont * 0.86 + ridgeTerm * 0.52 + small * 1.08 + macroBias + interiorLift;
  let h = hOcean * oceanMask + hLand * landMask;
    // Push oceans down and land up mildly to create true surrounding oceans
    if (oceanEncapsulation > 0) {
      const pushDown = oceanEncapsulation * 0.16;
      const liftLand = oceanEncapsulation * 0.10;
      h = h - oceanMask * pushDown + landMask * liftLand;
    }
    h = clamp01(h);

    // Rift valleys: on a subset of plate boundaries, carve deep linear depressions
    const riftEligible = ((hash2i(elevCellIdSeed(xw, yw, seedInt), seedInt, 0x5bd1e995) >>> 0) % 7) === 0;
    if (riftEligible) {
      // Strongest near edges (edgeInv ~1), taper inward
      const valley = smoothstep(0.5, 1.0, edgeInv);
      h = clamp01(h - valley * 0.12);
      ridgeTerm *= 1.6; // flanking ridges taller
    }
  // Global sea-level bias (positive => more ocean coverage)
  if (seaBias !== 0) h = clamp01(h - seaBias);
  h = clamp01(h);
  return { h, cont, edge, ridge: ridgeN, cell: w, riftEligible };
  }

  // Helper to generate a stable id for rift selection based on warped coordinates
  function elevCellIdSeed(xw, yw, seedIntLocal) {
    // Map to coarse grid to align with plate boundaries
    const kx = Math.floor(xw / cellSize);
    const ky = Math.floor(yw / cellSize);
    return hash2i(kx, ky, seedIntLocal);
  }

  function climateAt(x, y, elevMacro) {
  // Latitude position (repeating belts) with gentle warp to avoid straight seams
  const latCoord0 = (x * latAxis.x + y * latAxis.y);
  const latWarp = simplex2(noises.detail, x, y, baseFreq * 0.35) * (latPeriod * 0.06);
  const latCoord = latCoord0 + latWarp;
  const latBand = Math.abs(((latCoord / latPeriod) % 1 + 1) % 1 - 0.5) * 2; // 0 at equator stripe, 1 at poles
  let temp = 1 - latBand; // 1 tropics .. 0 poles
  temp = clamp01(temp - elevMacro * lapseRate);
  // Global warmth bias to reduce overall cold coverage
  temp = clamp01(temp * 0.92 + 0.08);

  // Winds: smoothly blend between trades (<~0.3), westerlies (~mid), polar (>~0.75)
  const absLat = latBand; // 0..1
  const trades = { x: -lonAxis.x, y: -lonAxis.y }; // E->W
  const west = { x: lonAxis.x, y: lonAxis.y };     // W->E
  const polar = { x: -lonAxis.x, y: -lonAxis.y };  // E->W
  const a = 0.08; // half-width of blend zones
  const w1 = smoothstep(0.3 - a, 0.3 + a, absLat);     // trades -> west
  const w2 = smoothstep(0.75 - a, 0.75 + a, absLat);   // west -> polar
  let windDir = { x: trades.x * (1 - w1) + west.x * w1, y: trades.y * (1 - w1) + west.y * w1 };
  windDir = { x: windDir.x * (1 - w2) + polar.x * w2, y: windDir.y * (1 - w2) + polar.y * w2 };
  // normalize to keep step distance consistent
  const mag = Math.hypot(windDir.x, windDir.y) || 1;
  windDir.x /= mag; windDir.y /= mag;

    // Moisture proxy: maritime vs interior from continental base value
  // Moisture proxy: accentuate continental interior dryness
  let moisture = clamp01(1 - Math.pow(elevMacro, 1.25)); // coast=wet, interior=dry (stronger)

    // Rain shadow using upslope/downslope along wind (reuse continental macro only)
  const step = 18; // sample distance in axial units
    const up = n01(noises.base, x + windDir.x * step, y + windDir.y * step, baseFreq);
    const down = n01(noises.base, x - windDir.x * step, y - windDir.y * step, baseFreq);
  const grad = (up - down) * 0.5; // signed slope along wind
  if (grad > 0) moisture = clamp01(moisture + grad * 0.8); // wetter windward (slightly stronger)
  else moisture = clamp01(moisture + grad * 1.25); // drier leeward (stronger rain shadow)

  return { temp, moisture, windDir, lat01: 1 - latBand };
  }

  function renderHints({ elevBand, h, moisture, temp, slope, shelfDepth01 }) {
    // More bathymetry steps and stronger aridity contrast; lower snow line
    let bathymetryStep = 0;
    if (elevBand === ElevationBand.Shelf) bathymetryStep = shelfDepth01 < 0.25 ? 1 : shelfDepth01 < 0.5 ? 2 : shelfDepth01 < 0.75 ? 3 : 4;
    else if (elevBand === ElevationBand.DeepOcean) bathymetryStep = h < ElevationThresholds.deep * 0.4 ? 6 : h < ElevationThresholds.deep * 0.7 ? 5 : 4;
  const aridityTint = clamp01((1 - moisture) * 1.2);
  const snowBase = h >= (ElevationThresholds.high * 0.95) ? 1 : 0.55; // less persistent low-elevation snow
  const rockExposure = clamp01((slope * 0.75) + (h > ElevationThresholds.high ? 0.25 : 0));
  // Moisture-aware snow: cold + available moisture; always allow peaks to stay snowy
  const moistureFactor = 0.2 + moisture * 0.8; // arid cold = sparse snow, humid cold = heavy snow
  const snowMask = clamp01((1 - temp) * snowBase * moistureFactor);
    return { bathymetryStep, aridityTint, rockExposure, snowMask };
  }

  function get(q, r) {
    const { x, y } = axialToPlane(q, r);
    const elev = elevationAt(x, y);

  // Shelf depth and slope estimate (use continental base only to keep call budget)
  const eps = 8;
  const c1 = n01(noises.base, x + eps, y, baseFreq);
  const c2 = n01(noises.base, x, y + eps, baseFreq);
  const dx = c1 - elev.cont;
  const dy = c2 - elev.cont;
  const slope = clamp01(Math.hypot(dx, dy) * 3.2);

    const elevBand = classifyElevationBand(elev.h);
    const shelfDepth01 = elevBand === ElevationBand.Shelf ? clamp01((elev.h - ElevationThresholds.deep) / (ElevationThresholds.shelf - ElevationThresholds.deep)) : 0;
    // Base climate
    let clim = climateAt(x, y, elev.cont);
    // Region archetype from plate cell id + latitude
    const archetype = chooseArchetype(elev.cell.id, clim.lat01);
    // Fade archetype influence near plate boundaries to avoid hard seams between adjacent cells
    const archetypeWeight = smoothstep(0.18, 0.82, elev.edge); // 0 near edge, 1 deep inside plate cell
    const applyDelta = (c, dT, dM, w) => ({
      ...c,
      temp: clamp01(c.temp + dT * w),
      moisture: clamp01(c.moisture + dM * w),
    });
    switch (archetype) {
      case Archetype.EquatorialWet: clim = applyDelta(clim, +0.07, +0.18, archetypeWeight); break;
      case Archetype.SubtropicalDryWest: clim = applyDelta(clim, 0.0, -0.18, archetypeWeight); break;
      case Archetype.SubtropicalMonsoonEast: clim = applyDelta(clim, 0.0, +0.12, archetypeWeight); break;
      case Archetype.TemperateMaritime: clim = applyDelta(clim, 0.0, +0.10, archetypeWeight); break;
      case Archetype.TemperateContinental: clim = applyDelta(clim, 0.0, -0.15, archetypeWeight); break;
      case Archetype.BorealPolar: clim = applyDelta(clim, -0.10, 0.0, archetypeWeight); break;
      default: break;
    }
    // Odd climate pockets by macro cell (also fade at edges so pockets don't create seams)
    const oddRoll = (elev.cell.id >>> 0) % 17;
    if (oddRoll === 0) clim = applyDelta(clim, +0.12, +0.12, archetypeWeight * 0.9); // warm oasis
    else if (oddRoll === 7) clim = applyDelta(clim, -0.12, -0.10, archetypeWeight * 0.9); // cold pocket

    const tBand = classifyTemperatureBand(clim.temp);
    const mBand = classifyMoistureBand(clim.moisture);

    const isCoast = (elevBand === ElevationBand.Coast);
    const coldness = 1 - clim.temp;
    const shelfKind = elevBand === ElevationBand.Shelf
      ? (tBand === TemperatureBand.Tropical ? 'CoralSea' : (tBand === TemperatureBand.Polar ? 'IceMarginalSea' : 'KelpShelf'))
      : null;

    const major = pickBiomeMajor({ elevBand, tBand, mBand, slope, isCoast, shelfKind, coldness, archetype });

    // Special overrides (sparse): volcanic & salt flats via hashed rarity
  const hashLocal = hash2i(Math.floor(x), Math.floor(y), seedInt) >>> 0;
  const volcanic = (hashLocal % 1993) === 0 || (elev.ridge > 0.9 && (hashLocal % 11) === 0);
  const basinness = (slope < 0.22) && (elev.h < Math.max(0.18, elev.cont - 0.02));
  const inlandSea = basinness && elev.h < 0.14 && ((hashLocal >>> 6) % 73 === 0);
  const lake = (!inlandSea) && basinness && (mBand !== MoistureBand.Arid) && ((hashLocal >>> 8) % 53 === 0);
    const karst = (mBand === MoistureBand.Humid || mBand === MoistureBand.Saturated) && slope > 0.25 && slope < 0.6;
  const badlands = (mBand === MoistureBand.SemiArid || mBand === MoistureBand.Arid) && slope > 0.55 && major.indexOf('Desert') >= 0;
  const saltFlats = basinness && (mBand === MoistureBand.Arid || mBand === MoistureBand.SemiArid) && slope < 0.2;
  const fjord = (elevBand === ElevationBand.Coast) && (coldness > 0.55) && slope > 0.55;
  const mangrove = (elevBand === ElevationBand.Coast) && (tBand === TemperatureBand.Tropical) && (mBand !== MoistureBand.Arid) && slope < 0.40;
    const wetland = (mBand === MoistureBand.Saturated) && (slope < 0.3) && (elevBand === ElevationBand.Lowland || lake);
  const rift = !!elev.riftEligible && elev.edge > 0.6;
  const plateau = (elevBand === ElevationBand.Highland || elevBand === ElevationBand.Mountain) && slope < 0.22 && (elev.h > ElevationThresholds.high);
  const marshRing = lake && (mBand === MoistureBand.Humid || mBand === MoistureBand.Saturated);

    // Relief proxy from ridge & detail (no extra calls)
  const relief = clamp01(elev.ridge * 0.65 + slope * 0.35);
    const sub = pickBiomeSub({ major, slope, relief, archetype, tBand });

  const hints = renderHints({ elevBand, h: elev.h, moisture: clim.moisture, temp: clim.temp, slope, shelfDepth01 });
  // Provide archetypeWeight to rendering for smoothing color transitions near cell edges
  const render = { ...hints, archetypeWeight };

    return {
      q, r,
      elevationBand: elevBand,
      temperatureBand: tBand,
      moistureBand: mBand,
      biomeMajor: major,
      biomeSub: sub,
      regionArchetype: archetype,
      flags: {
        lake: !!lake,
        inlandSea: !!inlandSea,
        wetland: !!wetland,
        volcanic: !!volcanic,
        karst: !!karst,
        badlands: !!badlands,
        saltFlats: !!saltFlats,
        fjord: !!fjord,
        mangrove: !!mangrove,
        plateau: !!plateau,
        rift: !!rift,
        marshRing: !!marshRing,
      },
  render,
      // Extra raw fields for debugging/tuning
      fields: {
        h: elev.h,
        cont: elev.cont,
        plateEdge: elev.edge,
        ridge: elev.ridge,
        slope,
        lat01: clim.lat01,
        temp: clim.temp,
        moisture: clim.moisture,
        shelfDepth01,
        cellId: elev.cell.id >>> 0,
      },
    };
  }

  function setTuning(newTuning = {}) {
    tuning = { ...tuning, ...newTuning };
    applyTuning();
  }

  return { get, setTuning };
}

export function computeHex(seed, q, r) {
  const gen = createHexGenerator(seed);
  return gen.get(q, r);
}
