HexWorldGenerator 2.0
=====================

Minimal, deterministic per‑hex world generator following the goals laid out in
`docs/world_generation_2.0.md`. The generator is stateless and performs a small
number of Simplex noise reads to compute elevation, climate and biome data for
any `(q, r)` coordinate.

Usage:
```js
import { createWorldGenerator } from '@/3d/world/generation';
const gen = createWorldGenerator('2.0', 12345);
const tile = gen.get(10, -3);
console.log(tile.biomeMajor, tile.elevationBand);
```

Profile switching is preserved so alternative generator versions can be
registered at runtime via `registerWorldGenerator`.
