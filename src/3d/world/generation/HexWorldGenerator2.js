// Deterministic hex world generator following the world_generation_2.0
// specification.  Each tile is generated purely from `(seed, q, r)` and the
// generator keeps a strict noise budget so it can run on mobile phones.
//
// The generator is intentionally small – the focus of this refactor is the
// layout of the layers described in the 2.0 design document.  Many of the
// algorithms are simplified but the data flow matches the spec and can be
// extended without rewriting call‑sites.

import SimplexNoise from 'simplex-noise';
/* eslint-disable no-param-reassign */

// ---------------------------------------------------------------------------
// Hash helpers / deterministic PRNG
// integer hash
function hash2i(x, y, seed) {
  let a = (x | 0) * 374761393 + (seed | 0) * 668265263; a |= 0;
  let b = (y | 0) * 1274126177 + 974711; b |= 0;
  a ^= a << 13; a ^= a >>> 17; a ^= a << 5;
  b ^= b << 13; b ^= b >>> 17; b ^= b << 5;
  const c = (a + b) | 0;
  return c ^ (c >>> 16);
}

// ---------------------------------------------------------------------------
// Geometry helpers
const SQRT3 = Math.sqrt(3);
function axialToPlane(q, r) {
  return { x: 1.5 * q, y: SQRT3 * (r + q / 2) };
}

// Basic worley noise returning cell id and distance to cell edge.  This is a
// very small implementation: for each point we only look at the immediate
// neighbours which is sufficient for the coarse plate/region fields.
function worley(x, y, freq, seed) {
  const cx = Math.floor(x * freq);
  const cy = Math.floor(y * freq);
  let best = Infinity; let id = 0; let edge = 0;
  for (let j = -1; j <= 1; j += 1) {
    for (let i = -1; i <= 1; i += 1) {
      const gx = cx + i; const gy = cy + j;
      const px = gx + hash2i(gx, gy, seed) / 4294967296;
      const py = gy + hash2i(gx ^ 0x9e37, gy ^ 0x85eb, seed) / 4294967296;
      const dx = x * freq - px;
      const dy = y * freq - py;
      const d = Math.hypot(dx, dy);
      if (d < best) {
        best = d; id = hash2i(gx, gy, seed);
        // distance to edge is approximated by second closest feature
        const dx2 = x * freq - (gx + 0.5);
        const dy2 = y * freq - (gy + 0.5);
        edge = Math.hypot(dx2, dy2);
      }
    }
  }
  return { id, edge: edge / Math.SQRT2 };
}

function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
function lerp(a, b, t) { return a + (b - a) * t; }

// ---------------------------------------------------------------------------
// Default configuration (tuneable at runtime via setTuning)
const DEFAULT_CONF = {
  macro: { sea_level: 0.52 },
  warp: {
    slow: { freq: 0.008, amp: 40 },
    fast: { freq: 0.04, amp: 6 },
  },
  plates: { freq: 0.0015, ridge_amp: 0.45 },
  detail: { freq: 0.05, amp: 0.15 },
  region: { freq: 0.0008 },
  special: { freq: 0.0005, threshold: 0.93 },
};

const BIOME_COLORS = {
  Ocean: 0x3366cc,
  Coast: 0x5fa9dd,
  Plains: 0x88b86f,
  Desert: 0xdabc6a,
  Savanna: 0xc9d29b,
  Rainforest: 0x4f9e4f,
  Mountain: 0xbababa,
  Snow: 0xffffff,
  GlassDesert: 0xe0e5ff,
};

// Elevation bands used by the renderer for vertical exaggeration
const ELEV_BANDS = [
  { band: 'DeepOcean', t: 0.1 },
  { band: 'Shelf', t: 0.2 },
  { band: 'Coast', t: 0.25 },
  { band: 'Lowland', t: 0.55 },
  { band: 'Highland', t: 0.75 },
  { band: 'Mountain', t: 0.88 },
  { band: 'Peak', t: 1.01 },
];
function classifyElevationBand(h) {
  for (const b of ELEV_BANDS) { if (h < b.t) return b.band; }
  return 'Peak';
}

// ---------------------------------------------------------------------------
export function createHexGenerator2(seed) {
  // local copy of configuration so callers can tune without mutating defaults
  const conf = JSON.parse(JSON.stringify(DEFAULT_CONF));

  // create noise sources – each seeded deterministically
  const n = {
    warpX: new SimplexNoise('warpX:' + seed),
    warpY: new SimplexNoise('warpY:' + seed + 'y'),
    warpXF: new SimplexNoise('warpXF:' + seed + 'f'),
    warpYF: new SimplexNoise('warpYF:' + seed + 'g'),
    macro1: new SimplexNoise('macro1:' + seed),
    macro2: new SimplexNoise('macro2:' + seed + 'b'),
    detail: new SimplexNoise('detail:' + seed),
    temp: new SimplexNoise('temp:' + seed),
    moisture: new SimplexNoise('moist:' + seed),
    region: new SimplexNoise('region:' + seed),
    special: new SimplexNoise('special:' + seed),
  };

  function simplex(noise, x, y, f) { return noise.noise2D(x * f, y * f); }
  function n01(noise, x, y, f) { return 0.5 * (simplex(noise, x, y, f) + 1); }

  function layer1(x, y) {
    // Domain warp – two warps as described in spec (slow + fast)
    const sx = simplex(n.warpX, x, y, conf.warp.slow.freq) * conf.warp.slow.amp;
    const sy = simplex(n.warpY, x, y, conf.warp.slow.freq) * conf.warp.slow.amp;
    const fx = simplex(n.warpXF, x, y, conf.warp.fast.freq) * conf.warp.fast.amp;
    const fy = simplex(n.warpYF, x, y, conf.warp.fast.freq) * conf.warp.fast.amp;
    const xw = x + sx + fx;
    const yw = y + sy + fy;

    // Continental mask using two octave fbm
    const c0 = n01(n.macro1, xw, yw, 0.0035);
    const c1 = n01(n.macro2, xw, yw, 0.0015);
    const cont = clamp01(c0 * 0.7 + c1 * 0.3);

    // Plate field
    const plate = worley(xw, yw, conf.plates.freq, seed);
    const edge = clamp01(plate.edge); // 0 at center, ~1 at edge
    const ridge = (1 - edge) * conf.plates.ridge_amp;

    // Medium detail
    const d = simplex(n.detail, xw, yw, conf.detail.freq) * conf.detail.amp;

    // Elevation assembly
    let h = cont + ridge + d;
    h = clamp01(h);

    // Apply sea level
    const hNorm = clamp01((h - conf.macro.sea_level) + 0.5);

    // Climate proxies
    const temp = clamp01(1 - Math.abs(yw) / 1500 - hNorm * 0.5 + simplex(n.temp, xw, yw, 0.001) * 0.1);
    const moisture = clamp01(1 - hNorm + n01(n.moisture, xw, yw, 0.005) * 0.6);

    return { x: xw, y: yw, h: hNorm, cont, ridge, plateId: plate.id, edge, temp, moisture };
  }

  function layer2(info) {
    // Region breakup: low frequency noise selecting region ids
    const r = worley(info.x, info.y, conf.region.freq, seed ^ 0xabc);
    const roll = (hash2i(r.id, seed, 0x5bd1e995) >>> 0) % 3;
    let archetype = 'Generic';
    if (roll === 0) { archetype = 'Megaplain'; info.h = lerp(info.h, 0.55, 0.35); }
    else if (roll === 1) { archetype = 'Badlands'; info.h = clamp01(info.h + 0.08); }
    else if (roll === 2) { archetype = 'HighPlateau'; info.h = clamp01(info.h + 0.15); }
    info.archetype = archetype;
  }

  function pickBiome(info) {
    const h = info.h;
    const t = info.temp;
    const m = info.moisture;
    if (h < 0.12) return 'Ocean';
    if (h < 0.14) return 'Coast';
    if (h > 0.85) return t < 0.4 ? 'Snow' : 'Mountain';
    if (t > 0.75 && m > 0.6) return 'Rainforest';
    if (t > 0.65 && m < 0.35) return 'Desert';
    if (t > 0.6) return 'Savanna';
    return 'Plains';
  }

  function layer3(info) {
    info.biome = pickBiome(info);
    info.color = BIOME_COLORS[info.biome] || 0x888888;
  }

  function layer35(info) {
    // Simple clutter choice based on biome
    const map = {
      Rainforest: ['tree_big', 'tree_small'],
      Savanna: ['acacia', 'rock'],
      Desert: ['cactus', 'rock'],
      Plains: ['grass', 'rock'],
      Mountain: ['rock'],
      Snow: ['snowrock'],
      Coast: ['sand_rock'],
      Ocean: [],
    };
    info.clutter = map[info.biome] || [];
  }

  function layer4(info) {
    if (info.biome !== 'Desert') return;
    const special = n01(n.special, info.x, info.y, conf.special.freq);
    if (special > conf.special.threshold) {
      info.biome = 'GlassDesert';
      info.color = BIOME_COLORS.GlassDesert;
    }
  }

  function layer5(info) {
    // global visual adjustments – light touch
    const c = info.color;
    // apply small contrast boost
    const r = (c >> 16) & 255;
    const g = (c >> 8) & 255;
    const b = c & 255;
    const adj = v => clamp01((v / 255) * 1.1) * 255;
    info.color = (adj(r) << 16) | (adj(g) << 8) | adj(b);
  }

  function get(q, r) {
    const { x, y } = axialToPlane(q, r);
    const info = layer1(x, y);
    layer2(info);
    layer3(info);
    layer35(info);
    layer4(info);
    layer5(info);
    info.elevationBand = classifyElevationBand(info.h);
    return {
      biome: info.biome,
      color: info.color,
      elevationBand: info.elevationBand,
      fields: { h: info.h, temp: info.temp, moisture: info.moisture, ridge: info.ridge },
      clutter: info.clutter,
    };
  }

  function setTuning(partial) {
    Object.assign(conf.macro, partial?.macro);
    Object.assign(conf.warp.slow, partial?.warp?.slow);
    Object.assign(conf.warp.fast, partial?.warp?.fast);
    Object.assign(conf.plates, partial?.plates);
    Object.assign(conf.detail, partial?.detail);
    Object.assign(conf.region, partial?.region);
    Object.assign(conf.special, partial?.special);
  }

  return { get, setTuning };
}

export default { createHexGenerator2 };

