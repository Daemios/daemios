HexWorldGenerator 2.0
=====================

Deterministic per-hex world generator implementing the `world_generation_2.0`
design. Each hex is computed as a pure function of `(seed, q, r)` and returns
terrain, climate and biome information suitable for the 3D world map.

Usage:

```js
import { createHexGenerator2 } from '@/3d/world/generation/HexWorldGenerator2.js';
const gen = createHexGenerator2(12345);
const cell = gen.get(10, -3);
console.log(cell.biomeMajor, cell.elevationBand);
```

Noise budget per hex (typical):

- Domain warp: 2 samples
- Continental base: 1 sample + 1 detail
- Plate field: Worley lookup
- Climate: 2 samples

≈9–10 total noise reads, keeping the generator mobile friendly.
