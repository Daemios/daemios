import * as SimplexNoiseModule from 'simplex-noise';
const SimplexNoise = (SimplexNoiseModule && SimplexNoiseModule.default) || SimplexNoiseModule;

const cache = new Map();
const ATTRIBUTES = ['elevation', 'moisture', 'flora', 'passable', 'territory'];

export function initNoise(seed = '') {
  if (cache.has(seed)) return cache.get(seed);
  const noises = {};
  ATTRIBUTES.forEach((attr) => {
    noises[attr] = new SimplexNoise(`${seed}:${attr}`);
  });
  cache.set(seed, noises);
  return noises;
}

export function sampleNoise(noises, x, y) {
  const values = {};
  Object.keys(noises).forEach((attr) => {
    values[attr] = (noises[attr].noise2D(x * 0.05, y * 0.05) + 1) / 2;
  });
  return values;
}

export default { initNoise, sampleNoise };
