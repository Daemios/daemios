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
  // Updated thresholds for stronger elevation contrast
  if (h < 0.05) return 'deepWater';
  if (h < 0.12) return 'shallowWater';
  if (h < 0.20) return 'beach';
  if (h < 0.45) return 'lowland';
  if (h < 0.70) return 'highland';
  if (h < 0.88) return 'mountain';
  return 'snow';
}

// Export thresholds so terrain generation / height shaping can reference them without duplication
export const BIOME_THRESHOLDS = {
  deepWater: 0.05,
  shallowWater: 0.12,
  beach: 0.20,
  lowland: 0.45,
  highland: 0.70,
  mountain: 0.88,
};

// biomeColor(h, foliage, t): elevation drives base biome; foliage selects land vegetation band.
export function biomeColor(h, foliage, t, outColor = new THREE.Color()) {
  // Determine base color via elevation bands (updated thresholds) with intra-band gradients
  if (h < 0.05) {
    const f = h / 0.05; // 0-0.05
    outColor.copy(palette.deepWater).lerp(palette.shallowWater, Math.pow(f, 0.6));
  } else if (h < 0.12) {
    const f = (h - 0.05) / 0.07; // 0.05-0.12
    outColor.copy(palette.shallowWater).lerp(palette.beach, f);
  } else if (h < 0.20) {
    const f = (h - 0.12) / 0.08; // 0.12-0.20
    outColor.copy(palette.beach).lerp(palette.lowland, f);
  } else if (h < 0.45) {
    const f = (h - 0.20) / 0.25; // 0.20-0.45
    outColor.copy(palette.lowland).lerp(palette.highland, Math.pow(f, 1.1));
  } else if (h < 0.70) {
    const f = (h - 0.45) / 0.25; // 0.45-0.70
    outColor.copy(palette.highland).lerp(palette.mountain, Math.pow(f, 0.9));
  } else if (h < 0.88) {
    const f = (h - 0.70) / 0.18; // 0.70-0.88
    outColor.copy(palette.mountain).lerp(palette.snow, f);
  } else {
    outColor.copy(palette.snow);
  }

  // Foliage bands for land only (beach..highland). Does NOT affect water level.
  if (h >= 0.12 && h < 0.88) {
    const band = classifyFoliage(foliage);
    let target;
    if (band === 'desert') target = palette.desertTan;
    else if (band === 'plains') target = palette.plainsGreen;
    else target = palette.forestGreen;

    let strength = 0.0;
    if (h < 0.20) strength = band === 'desert' ? 0.20 : 0.12; // beach: slightly stronger desert accent
    else if (h < 0.45) strength = band === 'plains' ? 0.30 : 0.60; // lowland: stronger contrasts
    else if (h < 0.70) strength = band === 'plains' ? 0.25 : 0.50; // highland: moderate-strong
    else strength = band === 'plains' ? 0.22 : 0.45; // mountain foothills: moderate

    outColor.lerp(target, strength);
  }

  // Temperature only pales in the coldest 0.0–0.1; otherwise ignored
  if (t <= 0.15) {
    const factor = 1 - (t / 0.1); // 1 at 0.0, 0 at 0.1
    const hsl = { h: 0, s: 0, l: 0 };
    outColor.getHSL(hsl);
    hsl.s = hsl.s * (1 - 0.5 * factor);
    hsl.l = Math.min(1, hsl.l + 0.10 * factor);
    outColor.setHSL(hsl.h, hsl.s, hsl.l);
  }

  return outColor;
}

export const Biomes = { palette, classifyBiome, biomeColor, BIOME_THRESHOLDS, classifyFoliage };
