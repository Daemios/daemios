HexWorldGenerator 2.0
=====================

Deterministic, mobile friendly hex world generator implementing the
`world_generation_2.0` design.  Terrain for each hex is a pure function of
`(seed, q, r)` and is built in **layers**:

1. **Continents & Oceans** – macro geography, plates and ridges.
2. **Regions** – mesoscale breakup with archetype elevation bias.
3. **Biomes** – base biome selection and palette.
3.5 **Clutter** – low poly asset set per biome.
4. **Special Regions** – rare overrides such as Glass Desert.
5. **Visual Adjustments** – global contrast and palette tweaks.

The generator intentionally keeps a small noise budget (≈7‑8 reads per hex)
to ensure 60fps on mid‑range phones.  Configuration is runtime‑tuneable via
`setTuning` and additional profiles can be registered through
`registerWorldGenerator`.

Usage
-----

```js
import { createWorldGenerator } from '@/3d/world/generation';

const gen = createWorldGenerator('2.0', 12345);
const tile = gen.get(10, -3);
console.log(tile.biome, tile.elevationBand);
```

The `tile` object also exposes `fields` (elevation, temperature, moisture,
ridge strength) and `clutter` array for rendering.

