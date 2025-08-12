Hex World Generator 2.0
=======================

Deterministic, mobile-friendly hex world generator implementing the
layered system defined in `docs/world_generation_2.0.md`.  Every tile is
a pure function of `(seed, q, r)` and requires only a handful of noise
reads.

Usage
-----
```js
import { createWorldGenerator } from "@/3d/world/generation";
const gen = createWorldGenerator('2.0', 12345);
const h = gen.get(10, -3);
console.log(h.biomeMajor, h.elevationBand);
```

Typical noise budget per hex:
- Domain warp: 2 samples
- Continental base: 1 sample
- Plate field + ridge: 2 samples
- Detail: 1 sample
- Region/special masks: ~1 sample
≈ 7–8 reads per tile
