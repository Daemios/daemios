// Simple deterministic RNG (Mulberry32)
export default function makeRng(seed = 1) {
  let t = Math.imul(seed ^ 0x85ebca6b, 0xc2b2ae35) >>> 0;
  return {
    next() {
      t += 0x6d2b79f5;
      let x = Math.imul(t ^ (t >>> 15), 1 | t);
      x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    },
    nextIn(min, max) {
      return min + (max - min) * this.next();
    },
    nextInt(min, max) {
      return Math.floor(this.nextIn(min, max + 1));
    },
    chance(p) {
      return this.next() < p;
    },
  };
}
