import { fbm, domainWarp } from './noiseUtils';
import worldConfig from './worldConfig.json';

// Build a continental mask: low-frequency FBM warped to produce large landmasses.
// Returns normalized height 0..1 where values below seaLevel map into ocean bands.
export function continentalMask(noise, x, z, scale) {
  const sx = x / scale;
  const sz = z / scale;

  const warpCfg = worldConfig.domainWarp || {};
  const warped = domainWarp(noise, sx, sz, warpCfg);

  // Use one fewer octave for macro geography to keep it very smooth.
  const fbmCfg = worldConfig.fbm || { octaves: 5, lacunarity: 2.0, gain: 0.5 };
  const macroOctaves = Math.max(3, fbmCfg.octaves - 1);
  const macroSampler = fbm(noise, macroOctaves, fbmCfg.lacunarity, fbmCfg.gain);

  // sample macro FBM
  const v = macroSampler(warped.x, warped.y); // -1..1
  const base = (v + 1) / 2; // 0..1

  // sea-level normalization: compress water band into a lower range so "seaLevel"
  // from config maps to a consistent shallow/deep threshold.
  const seaLevel = typeof worldConfig.seaLevel === 'number' ? worldConfig.seaLevel : 0.52;
  const shallowBand = 0.26; // keep parity with previous biome thresholds

  let h;
  if (base < seaLevel) {
    // ocean: map 0..seaLevel -> 0..shallowBand
    h = (base / seaLevel) * shallowBand;
  } else {
    // land: map seaLevel..1 -> shallowBand..1
    h = shallowBand + ((base - seaLevel) / (1 - seaLevel)) * (1 - shallowBand);
  }

  // clamp safety
  if (h < 0) h = 0;
  if (h > 1) h = 1;
  return h;
}

export default { continentalMask };
