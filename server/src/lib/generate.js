import SimplexNoise from 'simplex-noise';
import cartesian from './cartesian.js';

// const seedRandom = require('./seedrandom.cjs');

const generate = {
  arena: {
    simplexTerrain(size, seed) {
      // Build the map
      const generated = cartesian.build(size);

      // These are the cell attributes we're working with
      const attributes = ['elevation', 'moisture', 'flora', 'passable'];
      const terrain = {};
      const noise = {};
      attributes.forEach((attr) => {
        terrain[attr] = null;
        // Create a new SimplexNoise instance for each attribute with a seed
        noise[attr] = new SimplexNoise(seed + attr);
      });

      // Build the initial state
      cartesian.iterate(generated, (x, y) => {
        // Assign the cell data
        generated[x][y] = {
          terrain: { ...terrain },
          effects: [],
        };
      });

      // Iterate through new arena and apply noise to everything
      cartesian.iterate(generated, (x, y) => {
        Object.keys(generated[x][y].terrain).forEach((terrain_type) => {
          generated[x][y].terrain[terrain_type] = (noise[terrain_type].noise2D(x * 0.05, y * 0.05) + 1) / 2;
        });
      });

      return generated;
    },
  },
  world: {
    build(size, seed) {
      // Build the map
      const generated = cartesian.build(size);

      // These are the cell attributes we're working with
      const attributes = ['elevation', 'moisture', 'flora', 'territory'];
      const terrain = {};
      const noise = {};
      attributes.forEach((attr) => {
        terrain[attr] = null;
        noise[attr] = new SimplexNoise(seed + attr);
      });

      // Build the initial state
      cartesian.iterate(generated, (x, y) => {
        // Assign the cell data
        generated[x][y] = {
          terrain: { ...terrain },
          effects: [],
        };
      });

      // Iterate through new arena and apply noise to everything
      cartesian.iterate(generated, (x, y) => {
        Object.keys(generated[x][y].terrain).forEach((terrain_type) => {
          const resolution = 0.0125;
          const amplifier = 8;
          const initial_noise = noise[terrain_type].noise2D(x * resolution, y * resolution) * 2;

          // First pass adds the "vanilla" terrain,
          // which is mostly flat with very mellow deformations
          let val = initial_noise;

          // Mountain generation is done by damping increasing
          // the amplitude of values near 1,
          // but not doing anything to values near 0.
          // This is repeated for 10 iterations for an increased effect
          for (let i = 0; i < 2; i++) {
            // To achieve this effect, you increase the value by
            // the percentage of 1 it is. so .75 is a 75% increase.
            val = (val * (1 + val)) / 2;
          }

          // Now we add our initial noise back to the map
          // to reduce the flattening effect of the loop on lower altitudes
          val += initial_noise / 2;

          // Now we need to do some normalization work,
          // this is just a rough estimate to pull things out of the neg
          val += 0.54;

          // This is used to limit test upper limit of
          // mountains at this point in loop
          if (val > 7.51) {
            console.log('high', val);
          }

          // Add up to 5% noise based on elevation so
          // that the mountains look a little wilder
          // val += (seedRandom(seed + terrain_type + x + y)() * 7.5 - 3.75) * 0.10 * (val / 10);

          // Now we make the terrain form
          // an island by first reducing it's
          const percentage_from_center = (Math.abs((size / 2) - Math.max(x, y)) / (size));
          val -= (40 * (percentage_from_center));
          val += 7.5;

          generated[x][y].terrain[terrain_type] = (val) * amplifier;
        });
      });

      return generated;
    },
  },
};

export default generate;
