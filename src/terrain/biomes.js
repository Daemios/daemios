// Biome classification and color utilities.
// See docs/biome_rules.md for specification.
import * as THREE from 'three';

// Base biome colors
const palette = {
  deepWater: new THREE.Color('#143d59'),
  shallowWater: new THREE.Color('#2f6fa5'),
  beach: new THREE.Color('#d8c9a6'),
  lowland: new THREE.Color('#5fae4d'),
  highland: new THREE.Color('#6e8f5e'),
  mountain: new THREE.Color('#b7b7b7'),
  snow: new THREE.Color('#f5f5f5'),
  desertTan: new THREE.Color('#c2b280'),
  forestGreen: new THREE.Color('#2f7f4f'),
  plainsGreen: new THREE.Color('#5fae4d'),
};

// Foliage classification: desert < plains < forest
export function classifyFoliage(f) {
  if (f < 0.33) return 'desert';
  if (f < 0.66) return 'plains';
  return 'forest';
}

export function classifyBiome(h) {
  // Further squashed water bands (half previous): more land mass
  if (h < 0.06) return 'deepWater';
  if (h < 0.09) return 'shallowWater';
  if (h < 0.20) return 'beach';
  if (h < 0.66) return 'lowland';
  if (h < 0.86) return 'highland';
  if (h < 0.95) return 'mountain';
  return 'snow';
}

// Export thresholds so terrain generation / height shaping can reference them without duplication
export const BIOME_THRESHOLDS = {
  deepWater: 0.06,
  shallowWater: 0.09,
  beach: 0.20,
  lowland: 0.66,
  highland: 0.86,
  mountain: 0.95,
};

// biomeColor(h, foliage, t): elevation drives base biome; foliage selects land vegetation band.
export function biomeColor(h, foliage, t, outColor = new THREE.Color()) {
  // Determine base color via elevation bands (updated thresholds) with intra-band gradients
  if (h < 0.06) {
    const f = h / 0.06; // 0-0.06
    outColor.copy(palette.deepWater).lerp(palette.shallowWater, Math.pow(f, 0.6));
  } else if (h < 0.09) {
    const f = (h - 0.06) / 0.03; // 0.06-0.09
    outColor.copy(palette.shallowWater).lerp(palette.beach, f);
  } else if (h < 0.20) {
    const f = (h - 0.09) / 0.11; // 0.09-0.20
    outColor.copy(palette.beach).lerp(palette.lowland, f);
  } else if (h < 0.66) {
    const f = (h - 0.20) / 0.46; // 0.20-0.66
    outColor.copy(palette.lowland).lerp(palette.highland, Math.pow(f, 1.1));
  } else if (h < 0.86) {
    const f = (h - 0.66) / 0.20; // 0.66-0.86
    outColor.copy(palette.highland).lerp(palette.mountain, Math.pow(f, 0.9));
  } else if (h < 0.95) {
    const f = (h - 0.86) / 0.09; // 0.86-0.95
    outColor.copy(palette.mountain).lerp(palette.snow, f);
  } else {
    outColor.copy(palette.snow);
  }

  // Foliage bands for land only (beach..highland). Does NOT affect water level.
  if (h >= 0.09 && h < 0.86) {
    const band = classifyFoliage(foliage);
    let target;
    if (band === 'desert') target = palette.desertTan;
    else if (band === 'plains') target = palette.plainsGreen;
    else target = palette.forestGreen;

    let strength = 0.0;
    if (h < 0.20) strength = band === 'desert' ? 0.15 : 0.10; // beach: barely tint; desert shows slightly more
    else if (h < 0.66) strength = band === 'plains' ? 0.25 : 0.5; // lowland: plains subtle, desert/forest strong
    else strength = band === 'plains' ? 0.20 : 0.40; // highland: moderate

    outColor.lerp(target, strength);
  }

  // Temperature only pales in the coldest 0.0–0.1; otherwise ignored
  if (t <= 0.1) {
    const factor = 1 - (t / 0.1); // 1 at 0.0, 0 at 0.1
    const hsl = { h: 0, s: 0, l: 0 };
    outColor.getHSL(hsl);
    hsl.s = hsl.s * (1 - 0.4 * factor);
    hsl.l = Math.min(1, hsl.l + 0.08 * factor);
    outColor.setHSL(hsl.h, hsl.s, hsl.l);
  }

  return outColor;
}

export const Biomes = { palette, classifyBiome, biomeColor, BIOME_THRESHOLDS, classifyFoliage };
