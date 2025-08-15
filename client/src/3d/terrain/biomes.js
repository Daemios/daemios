// Biome classification and color utilities.
// See docs/biome_rules.md for specification.
import * as THREE from "three";

// Base biome colors (punchier, higher contrast)
const palette = {
  // Water
  abyss: new THREE.Color("#052234"), // darker blue
  deepWater: new THREE.Color("#0f3a59"),
  shallowWater: new THREE.Color("#1e6ea3"),
  shelfCyan: new THREE.Color("#11a6b8"),
  lagoon: new THREE.Color("#2fd6c7"),
  // Shore / land bands
  beach: new THREE.Color("#e4cfa3"),
  dune: new THREE.Color("#e2c58a"),
  lowland: new THREE.Color("#49b34f"), // brighter lush green
  highland: new THREE.Color("#6aa35a"),
  mountain: new THREE.Color("#bfc3c7"),
  alpineRock: new THREE.Color("#8b97a4"),
  snow: new THREE.Color("#ffffff"),
  // Vegetation accents
  desertTan: new THREE.Color("#d1b37a"), // warmer sands
  desertOrange: new THREE.Color("#d48f3b"),
  forestGreen: new THREE.Color("#2a7e44"),
  plainsGreen: new THREE.Color("#66c36c"),
  jungleGreen: new THREE.Color("#129b52"),
  tundra: new THREE.Color("#cbd7bf"),
  // Specials
  saltFlat: new THREE.Color("#f2efe7"),
  basalt: new THREE.Color("#2f2a2a"),
  wetTeal: new THREE.Color("#19a18f"),
  volcanicWarm: new THREE.Color("#7a3f2a"),
};

// Foliage classification: desert < plains < forest
export function classifyFoliage(f) {
  if (f < 0.33) return "desert";
  if (f < 0.66) return "plains";
  return "forest";
}

export function classifyBiome(h) {
  // Updated thresholds for stronger elevation contrast
  if (h < 0.05) return "deepWater";
  if (h < 0.12) return "shallowWater";
  if (h < 0.2) return "beach";
  if (h < 0.45) return "lowland";
  if (h < 0.7) return "highland";
  if (h < 0.88) return "mountain";
  return "snow";
}

// Export thresholds so terrain generation / height shaping can reference them without duplication
export const BIOME_THRESHOLDS = {
  deepWater: 0.05,
  shallowWater: 0.12,
  beach: 0.2,
  lowland: 0.45,
  highland: 0.7,
  mountain: 0.88,
};

// biomeColor(h, foliage, t): elevation drives base biome; foliage selects land vegetation band.
// biomeColor(h, foliage, t, outColor?, opts?)
// - h: 0..1 visual elevation
// - foliage: legacy vegetation proxy (we map generator moisture here)
// - t: 0..1 temperature
// - outColor: optional THREE.Color to write into
// - opts: optional advanced inputs from generator: {
//     moisture, temp, aridityTint, snowMask, rockExposure, bathymetryStep,
//     flags: { wetland, mangrove, volcanic, saltFlats, ... },
//     bands: { elevation, temp, moisture }, biomeMajor
//   }
export function biomeColor(
  h,
  foliage,
  t,
  outColor = new THREE.Color(),
  opts = null
) {
  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const get = (obj, key, fallback) =>
    obj && obj[key] != null ? obj[key] : fallback;
  const flags = (opts && opts.flags) || {};
  // bands from opts are currently unused in this implementation
  const tempN = clamp01(get(opts, "temp", t != null ? t : 0.5));
  const moistureN = clamp01(
    get(opts, "moisture", foliage != null ? foliage : 0.5)
  );
  const rockExpo = clamp01(get(opts, "rockExposure", 0));
  const aridityHint = clamp01(get(opts, "aridityTint", 0));
  const bathy = clamp01(get(opts, "bathymetryStep", 0));
  // biomeMajor hint currently unused
  const archetypeWeight = clamp01(get(opts, "archetypeWeight", 1));

  // Determine base color via elevation bands (updated thresholds) with intra-band gradients
  if (h < 0.05) {
    // Deep water: sandy seabed (slightly darker/desaturated with depth)
    const f = h / 0.05; // 0-0.05 from deep to less deep
    const baseSand = palette.desertTan.clone().lerp(palette.dune, 0.5);
    const deepSand = baseSand.clone();
    const hsl = { h: 0, s: 0, l: 0 };
    deepSand.getHSL(hsl);
    // Make deeper areas darker and less saturated
    const depth = 1 - f + bathy * 0.1;
    hsl.s = Math.max(0, hsl.s * (1 - 0.25 * depth));
    hsl.l = Math.max(0, hsl.l * (1 - 0.3 * depth));
    deepSand.setHSL(hsl.h, hsl.s, hsl.l);
    outColor.copy(deepSand);
  } else if (h < 0.12) {
    // Shallow water: lighter sandy seabed approaching beach
    const f = (h - 0.05) / 0.07; // 0.05-0.12
    const nearSea = palette.desertTan.clone().lerp(palette.dune, 0.6);
    const nearBeach = palette.beach.clone().lerp(palette.dune, 0.35);
    outColor.copy(nearSea).lerp(nearBeach, Math.pow(f, 0.85));
  } else if (h < 0.2) {
    const f = (h - 0.12) / 0.08; // 0.12-0.20
    // Dune accent stronger in hot/arid coasts; greener in humid tropics
    const duneBias = clamp01(tempN * 0.6 + (1 - moistureN) * 0.8);
    const beachTo = palette.beach.clone().lerp(palette.dune, 0.45 * duneBias);
    const greenLift = palette.lowland
      .clone()
      .lerp(palette.jungleGreen, 0.25 * clamp01(moistureN * tempN));
    outColor.copy(beachTo).lerp(greenLift, f);
  } else if (h < 0.45) {
    const f = (h - 0.2) / 0.25; // 0.20-0.45
    // Distinguish continents: wetter -> jungle greens; drier -> tan/olive
    const humid = clamp01(moistureN);
    const arid = 1 - humid;
    const lush = palette.lowland
      .clone()
      .lerp(palette.jungleGreen, 0.4 * clamp01(tempN * humid));
    const dry = palette.lowland
      .clone()
      .lerp(palette.desertTan, 0.45 * clamp01(arid));
    const mid = lush.clone().lerp(dry, arid);
    outColor.copy(mid).lerp(palette.highland, Math.pow(f, 1.05));
  } else if (h < 0.7) {
    const f = (h - 0.45) / 0.25; // 0.45-0.70
    // Slightly cooler tint toward alpine rock as we near mountains
    const mid = palette.highland.clone().lerp(palette.alpineRock, 0.28);
    outColor.copy(mid).lerp(palette.mountain, Math.pow(f, 0.9));
  } else if (h < 0.88) {
    const f = (h - 0.7) / 0.18; // 0.70-0.88
    outColor.copy(palette.mountain).lerp(palette.snow, f);
  } else {
    outColor.copy(palette.snow);
  }

  // Foliage bands for land only (beach..highland). Does NOT affect water level.
  if (h >= 0.12 && h < 0.88) {
    const band = classifyFoliage(foliage);
    let target;
    if (band === "desert") target = palette.desertTan;
    else if (band === "plains") target = palette.plainsGreen;
    else
      target =
        tempN > 0.6 && moistureN > 0.6
          ? palette.jungleGreen
          : palette.forestGreen;

    let strength = 0.0;
    if (h < 0.2)
      strength = band === "desert" ? 0.25 : 0.1; // beach: favor sand hues
    else if (h < 0.45)
      strength = band === "plains" ? 0.35 : 0.65; // lowland: vivid
    else if (h < 0.7) strength = band === "plains" ? 0.28 : 0.5; // highland
    else strength = band === "plains" ? 0.22 : 0.4; // foothills

    outColor.lerp(target, strength);

    // Moisture/aridity adjustments (continuous)
    const moisture = moistureN;
    if (moisture != null) {
      // More humid → richer greens (increase saturation, lower light slightly)
      // More arid → shift slightly toward tan and brighten
      const hsl = { h: 0, s: 0, l: 0 };
      outColor.getHSL(hsl);
      const humid = Math.max(0, Math.min(1, moisture));
      const arid = 1 - humid;
      // Saturation bump up to +28% in humid; lightness down to -8%
      hsl.s = Math.min(1, hsl.s * (1 + 0.28 * humid));
      hsl.l = Math.max(0, hsl.l * (1 - 0.08 * humid));
      outColor.setHSL(hsl.h, hsl.s, hsl.l);
      // Aridity tint toward desertTan/orange up to 28%
      if (arid > 0) {
        const warm = palette.desertTan.clone().lerp(palette.desertOrange, 0.45);
        outColor.lerp(warm, 0.28 * arid * (0.65 + 0.35 * archetypeWeight));
      }
    }
    // Explicit aridity tint from generator render hints (stronger than moisture proxy)
    if (opts && opts.aridityTint != null) {
      const warm = palette.desertTan.clone().lerp(palette.desertOrange, 0.35);
      outColor.lerp(warm, 0.3 * aridityHint * (0.65 + 0.35 * archetypeWeight));
    }

    // Rock exposure dulls color slightly
    if (opts && opts.rockExposure != null) {
      const r = rockExpo;
      // Blend toward alpineRock/gray; stronger near volcanic provinces to suggest basalt
      const rockTarget = flags.volcanic ? palette.basalt : palette.alpineRock;
      outColor.lerp(rockTarget, 0.2 * r);
    }

    // Wetlands/mangroves: add teal/blue-green tint (slightly stronger)
    const wet = flags.wetland || flags.mangrove;
    if (wet) {
      outColor.lerp(palette.wetTeal, 0.18);
    }
    // Volcanic provinces: darker, warmer
    if (flags.volcanic) {
      outColor.lerp(palette.volcanicWarm, 0.12);
      const hsl = { h: 0, s: 0, l: 0 };
      outColor.getHSL(hsl);
      hsl.l = Math.max(0, hsl.l - 0.06);
      outColor.setHSL(hsl.h, hsl.s, hsl.l);
    }

    // Salt flats: override toward bright salt color regardless of band
    if (flags.saltFlats) {
      outColor.lerp(palette.saltFlat, 0.65);
      const hsl = { h: 0, s: 0, l: 0 };
      outColor.getHSL(hsl);
      hsl.s = Math.max(0, hsl.s * 0.5);
      hsl.l = Math.min(1, Math.max(hsl.l, 0.8));
      outColor.setHSL(hsl.h, hsl.s, hsl.l);
    }

    // Temperature-driven hue shift on land: cold → bluish greens, hot → yellow/olive, slightly stronger
    {
      const hsl = { h: 0, s: 0, l: 0 };
      outColor.getHSL(hsl);
      // shift up to +/- 0.08 (~29 degrees) around mid temp 0.5
      const delta = (tempN - 0.5) * 0.16; // still moderate
      let hh = hsl.h + delta;
      if (hh < 0) hh += 1;
      else if (hh > 1) hh -= 1;
      outColor.setHSL(hh, hsl.s, hsl.l);
    }

    // Tundra desaturation in cold, semi-arid zones
    if (tempN < 0.26 && moistureN < 0.55 && h >= 0.2 && h < 0.7) {
      outColor.lerp(palette.tundra, 0.35);
      const hsl = { h: 0, s: 0, l: 0 };
      outColor.getHSL(hsl);
      hsl.s = hsl.s * 0.82;
      outColor.setHSL(hsl.h, hsl.s, hsl.l);
    }
  }

  // Temperature cold desaturation (legacy) and snow overlay
  if (t != null && t <= 0.12) {
    const factor = 1 - t / 0.1; // 1 at 0.0, 0 at 0.1
    const hsl = { h: 0, s: 0, l: 0 };
    outColor.getHSL(hsl);
    hsl.s = hsl.s * (1 - 0.45 * factor);
    hsl.l = Math.min(1, hsl.l + 0.08 * factor);
    outColor.setHSL(hsl.h, hsl.s, hsl.l);
  }
  if (opts && opts.snowMask != null && h >= 0.2) {
    const s = Math.max(0, Math.min(1, Math.pow(opts.snowMask, 1.1)));
    if (s > 0) outColor.lerp(palette.snow, s);
  }

  return outColor;
}

export const Biomes = {
  palette,
  classifyBiome,
  biomeColor,
  BIOME_THRESHOLDS,
  classifyFoliage,
};
