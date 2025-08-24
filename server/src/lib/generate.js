import cartesian from '../../../shared/utils/cartesian.js';
import { initNoise, sampleNoise } from '../../../shared/worldgen/noise.js';

const generate = {
  arena: {
    simplexTerrain(size, seed) {
      const generated = cartesian.build(size);
      const noises = initNoise(seed);

      cartesian.iterate(generated, (x, y) => {
        const n = sampleNoise(noises, x, y);
        generated[x][y] = {
          terrain: {
            elevation: n.elevation,
            moisture: n.moisture,
            flora: n.flora,
            passable: n.passable,
          },
          effects: [],
        };
      });

      return generated;
    },
  },
  world: {
    build(size, seed) {
      const generated = cartesian.build(size);
      const noises = initNoise(seed);

      cartesian.iterate(generated, (x, y) => {
        const n = sampleNoise(noises, x, y);
        generated[x][y] = {
          terrain: {
            elevation: n.elevation,
            moisture: n.moisture,
            flora: n.flora,
            territory: n.territory,
          },
          effects: [],
        };
      });

      return generated;
    },
  },
};

export default generate;
