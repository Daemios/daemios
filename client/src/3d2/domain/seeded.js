// JS wrapper for the seeded RNG used by domain helpers. Mirrors the TS
// implementation at seeded.ts but in JS so mixed environments can import it
// without TypeScript declaration issues.

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
