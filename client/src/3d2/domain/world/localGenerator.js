import SimplexNoise from 'simplex-noise';
import { SeededRNG } from '../seeded';

// Minimal, deterministic hex world generator for 3d2.
// Provides createWorldGenerator(type, seed) -> { get(q,r), setTuning(opts) }

const registry = new Map();

function makeNoise(seed) {
  // Use SeededRNG to provide a deterministic random function to SimplexNoise
  const rng = new SeededRNG(typeof seed === 'number' ? seed : String(seed).split('').reduce((s,c)=>s+c.charCodeAt(0),0));
  return new SimplexNoise(() => rng.next());
}

function createHexGenerator(seed, opts = {}) {
  const noise = makeNoise(seed);
  let scale = opts.scale || 12.0;
  const heightMult = typeof opts.heightMult === 'number' ? opts.heightMult : 1.0;

  function heightAt(q, r) {
    // sample simplex noise at scaled axial coordinates
    const x = q / scale;
    const y = r / scale;
    const v = noise.noise2D(x, y); // -1..1
    // normalize to 0..1 and apply multiplier
    return ((v + 1) / 2) * heightMult;
  }

  function get(q, r) {
    const h = heightAt(q, r);
    // rough slope estimate: max delta with 6 neighbors
    const neigh = [
      { q: q + 1, r },
      { q: q - 1, r },
      { q, r: r + 1 },
      { q, r: r - 1 },
      { q: q + 1, r: r - 1 },
      { q: q - 1, r: r + 1 },
    ];
    let maxDiff = 0;
    for (const n of neigh) {
      const nh = heightAt(n.q, n.r);
      const d = Math.abs(nh - h);
      if (d > maxDiff) maxDiff = d;
    }
    return { fields: { h, slope: maxDiff } };
  }

  return {
    get,
    setTuning(o) {
      if (o && typeof o.scale === 'number') scale = o.scale; // allow tuning scale
    },
  };
}

// API
export const availableWorldGenerators = ['hex:local'];

export function createWorldGenerator(type = 'hex', seed = 'seed', opts = {}) {
  if (type === 'hex' || type === 'hex:local') return createHexGenerator(seed, opts);
  // fallback: treat unknown as hex
  return createHexGenerator(seed, opts);
}

export function registerWorldGenerator(name, factory) {
  registry.set(name, factory);
}

export default { availableWorldGenerators, createWorldGenerator, registerWorldGenerator };
