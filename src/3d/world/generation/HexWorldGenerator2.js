// Hex World Generator 2.0
// Thin wrapper around the existing mobile-friendly generator with
// updated default tuning to match the 2.0 design goals.
// Deterministic and performant: reuses the v1 implementation
// but applies different macro tuning for 60–65% ocean coverage
// and slightly exaggerated relief.

import { createHexGenerator } from './HexWorldGenerator.js';

export function createHexGenerator2(seed) {
  const gen = createHexGenerator(seed);
  // Apply defaults inspired by the 2.0 spec.
  if (gen.setTuning) {
    gen.setTuning({
      // Encourage slightly higher ocean coverage and dramatic terrain
      oceanEncapsulation: 0.8,
      seaBias: 0.02,
      ridgeScale: 0.9,
    });
  }
  return gen;
}
