// shared/lib/worldgen/rng.js
// Deterministic RNG helpers used by worldgen. We export two primitives:
// - SeededRNG: a small LCG that matches the client implementation (useful as a
//   random source for SimplexNoise or other libraries that expect a RNG).
// - create(seed,q,r): a tile-scoped xorshift32-based random() helper used for
//   lightweight value-noise and deterministic choices.

// --- Seeded LCG (client parity) ---
export class SeededRNG {
  constructor(seed = 1) {
    this.state = seed >>> 0;
  }
  next() {
    this.state = (1664525 * this.state + 1013904223) >>> 0;
    return (this.state & 0xffffff) / 0x1000000;
  }
  nextInt(maxExclusive) {
    return Math.floor(this.next() * maxExclusive);
  }
}

// --- Tile-scoped xorshift32 helper ---
function hashStringToInt(s) {
  // simple DJB2-ish
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) + s.charCodeAt(i);
  return h >>> 0;
}

function xorshift32(seed) {
  let x = seed >>> 0;
  return function() {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 4294967295;
  };
}

function create(seed, q, r) {
  const s = String(seed) + ':' + String(q) + ':' + String(r);
  const h = hashStringToInt(s);
  return { random: xorshift32(h) };
}

export { create };
