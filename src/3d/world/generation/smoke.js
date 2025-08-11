import { createHexGenerator } from './HexWorldGenerator.js';

const gen = createHexGenerator(1337);
const samples = [
  { q: 0, r: 0 },
  { q: 50, r: -10 },
  { q: -120, r: 80 },
  { q: 400, r: 250 },
];

for (const s of samples) {
  const h = gen.get(s.q, s.r);
  console.log(`${s.q},${s.r} =>`, h.elevationBand, h.temperatureBand, h.moistureBand, h.biomeMajor, h.biomeSub, h.regionArchetype, h.flags);
}
