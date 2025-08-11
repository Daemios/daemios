HexWorldGenerator

- Pure, deterministic per-hex generator matching the mobile-friendly spec.
- A second generator, `2.0`, applies updated default tuning for the fantasy
  but plausible world generation design.
- Usage:

```js
import { createHexGenerator } from "@/3d/world/generation/HexWorldGenerator.js";
const gen = createHexGenerator(12345);
const h = gen.get(10, -3);
console.log(h.biomeMajor, h.elevationBand);
```

Noise budget per hex (typical):

- Domain warp: 2 samples (warpX, warpY)
- Continental base: 1–2 samples + 1 detail
- Ridge: 1 sample
- Slope estimates reuse macro calls; 2 more calls for forward differences
- Climate uses arithmetic + 2 macro samples for rain‑shadow
  ≈ 9–10 calls
