// Lightweight noise utilities for FBM, domain-warp, and a simple Voronoi helper.
// Designed to be deterministic when provided a seeded SimplexNoise instance.

// FBM (fractional Brownian motion) wrapper. Returns a function(x,y) -> -1..1
export function fbm(noise, octaves = 4, lacunarity = 2.0, gain = 0.5) {
  return function (x, y) {
    let amplitude = 1.0;
    let frequency = 1.0;
    let sum = 0.0;
    let max = 0.0;
    for (let i = 0; i < octaves; i++) {
      sum += amplitude * noise.noise2D(x * frequency, y * frequency);
      max += amplitude;
      amplitude *= gain;
      frequency *= lacunarity;
    }
    // normalize back to -1..1
    return sum / max;
  };
}

// Simple two-pass domain warp. Takes a SimplexNoise-like instance with noise2D(x,y)
// Returns an object { x, y } representing warped coordinates.
export function domainWarp(noise, x, y, opts = {}) {
  const ampA = typeof opts.ampA === 'number' ? opts.ampA : 0.8;
  const freqA = typeof opts.freqA === 'number' ? opts.freqA : 0.4;
  const ampB = typeof opts.ampB === 'number' ? opts.ampB : 0.25;
  const freqB = typeof opts.freqB === 'number' ? opts.freqB : 2.0;

  // Warp pass A (ultra-low frequency)
  const wx = noise.noise2D(x * freqA, y * freqA) * ampA;
  const wy = noise.noise2D((x + 100) * freqA, (y + 100) * freqA) * ampA;

  // Warp pass B (mid frequency) applied to already-warped coords
  const bx = noise.noise2D((x + wx) * freqB, (y + wy) * freqB) * ampB;
  const by = noise.noise2D((x + 200 + wx) * freqB, (y + 200 + wy) * freqB) * ampB;

  return { x: x + wx + bx, y: y + wy + by };
}

// Simple deterministic Voronoi helper using a grid of feature points.
// Returns { id: '<i>_<j>', dist: <0..inf>, fx, fy }
export function voronoi(x, y, cellSize = 16, seed = 0) {
  // transform into feature grid coordinates
  const gx = x / cellSize;
  const gy = y / cellSize;
  const ix = Math.floor(gx);
  const iy = Math.floor(gy);
  let best = { dist: Infinity, id: null, fx: 0, fy: 0 };

  // search neighboring grid cells for nearest site
  for (let j = iy - 1; j <= iy + 1; j++) {
    for (let i = ix - 1; i <= ix + 1; i++) {
      // deterministic pseudo-random offset in [0,1)
      const hx = hash2(i, j, seed);
      const hy = hash2(i, j, seed + 1);
      const siteX = i + hx;
      const siteY = j + hy;
      const dx = siteX - gx;
      const dy = siteY - gy;
      const d = Math.sqrt(dx * dx + dy * dy) * cellSize;
      if (d < best.dist) {
        best = { dist: d, id: `${i}_${j}`, fx: siteX * cellSize, fy: siteY * cellSize };
      }
    }
  }
  return best;
}

function hash2(i, j, seed = 0) {
  // small, fast hash -> [0,1)
  // Use modest constants to avoid large integer precision issues.
  const s = Math.sin(i * 127.1 + j * 311.7 + seed * 0.7) * 43758.5453123;
  return fract(s);
}

function fract(v) { return v - Math.floor(v); }

export default { fbm, domainWarp, voronoi };
