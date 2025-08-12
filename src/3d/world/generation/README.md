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

### Layered passes

The generator is organized into five passes mirroring the `world_generation_2.0`
design spec. Each pass is implemented as a dedicated function and invoked in
sequence so that behaviour matches the original monolithic generator while
allowing future tuning of individual layers.

1. **Layer 1 – Continents & Oceans**
2. **Layer 2 – Mesoscale & Regional Identity**
3. **Layer 3 – Biome Blending & Palette**
4. **Layer 4 – Special & Rare Regions**
5. **Layer 5 – Visual Cohesion & Style**

Noise budget per hex (typical):

- Domain warp: 2 samples (warpX, warpY)
- Continental base: 1–2 samples + 1 detail
- Ridge: 1 sample
- Slope estimates reuse macro calls; 2 more calls for forward differences
- Climate uses arithmetic + 2 macro samples for rain‑shadow
  ≈ 9–10 calls
