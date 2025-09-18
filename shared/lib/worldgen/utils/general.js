// shared/lib/worldgen/utils/general.js
// Common small helpers extracted from layer modules.

function seedStringToNumber(s) {
  let n = 0;
  for (let i = 0; i < s.length; i++) n = (n * 31 + s.charCodeAt(i)) >>> 0;
  return n || 1;
}

function pseudoRandom(ix, iy, seedNum) {
  const x = Math.sin((ix * 127.1 + iy * 311.7) + seedNum * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function smoothstep(t) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return t * t * (3 - 2 * t);
}

function findNearestPlate(x, z, plateSize, seedNum) {
  const px = Math.round(x / plateSize);
  const py = Math.round(z / plateSize);
  let best = { dist: Infinity, cx: 0, cy: 0, ix: 0, iy: 0, rand: 0 };
  for (let oy = -1; oy <= 1; oy++) {
    for (let ox = -1; ox <= 1; ox++) {
      const ix = px + ox;
      const iy = py + oy;
      const pr = pseudoRandom(ix, iy, seedNum);
      const jitterX = (pr - 0.5) * plateSize * 0.5;
      const jitterY = (pseudoRandom(ix, iy + 9999, seedNum) - 0.5) * plateSize * 0.5;
      const cx = ix * plateSize + jitterX;
      const cy = iy * plateSize + jitterY;
      const dx = x - cx;
      const dz = z - cy;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d < best.dist) best = { dist: d, cx, cy, ix, iy, rand: pr };
    }
  }
  return best;
}

export { seedStringToNumber, pseudoRandom, smoothstep, findNearestPlate };


