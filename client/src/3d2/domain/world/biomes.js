// Simple biome mapper for 3d2
// Maps normalized elevation (h: 0..1) and slope -> biome, colors and yScale
// Keep this minimal and deterministic so it can be used by WorldMapScene/ChunkManager
// Load scene configuration so water thresholds align with the generator's seaLevel.
import worldConfig from './worldConfig.json';

const SEA_LEVEL = (worldConfig && typeof worldConfig.seaLevel === 'number') ? worldConfig.seaLevel : 0.52;

// Compute thresholds so any elevation <= SEA_LEVEL is treated as water in this mapper.
// We keep a narrow deep/shallow split below SEA_LEVEL for visual variety.
export const BIOME_THRESHOLDS = {
  deepWater: Math.max(0.01, SEA_LEVEL * 0.25), // deepest band
  shallowWater: SEA_LEVEL, // anything at-or-below configured sea level is water
  beach: Math.min(0.95, SEA_LEVEL + 0.06),
  plains: 0.45,
  forest: 0.60,
  hill: 0.75,
  mountain: 0.9,
};

// Palette: top and side colors (hex)
const BIOME_PALETTE = {
  deepWater: { top: 0x1b3a4b, side: 0x13323b, yScale: 0.2 },
  shallowWater: { top: 0x2e6f8f, side: 0x234f66, yScale: 0.25 },
  beach: { top: 0xeed5a5, side: 0xcfb78a, yScale: 0.2 },
  plains: { top: 0x93c77b, side: 0x7ab26b, yScale: 0.9 },
  forest: { top: 0x579a57, side: 0x3f7a3f, yScale: 1.0 },
  hill: { top: 0xc2a06b, side: 0x96794f, yScale: 1.1 },
  mountain: { top: 0x9b9b9b, side: 0x777777, yScale: 1.25 },
  snow: { top: 0xf3f7fb, side: 0xdfe7ee, yScale: 1.25 },
  tundra: { top: 0xcbd3d6, side: 0xaeb6b8, yScale: 0.9 },
};

// Map elevation and slope to a biome key and properties
export function mapBiome({ h = 0, slope = 0, lat = 0 } = {}) {
  // clamp inputs
  const H = Math.max(0, Math.min(1, Number(h) || 0));
  const S = Math.max(0, Number(slope) || 0);

  // Water first
  if (H <= BIOME_THRESHOLDS.deepWater) {
    return { biome: 'deepWater', ...BIOME_PALETTE.deepWater };
  }
  if (H <= BIOME_THRESHOLDS.shallowWater) {
    return { biome: 'shallowWater', ...BIOME_PALETTE.shallowWater };
  }

  // Beach band
  if (H <= BIOME_THRESHOLDS.beach) {
    return { biome: 'beach', ...BIOME_PALETTE.beach };
  }

  // Mountains / high slope
  if (H >= BIOME_THRESHOLDS.mountain || S > 0.35) {
    // Very high: snow cap (simple lat-based modifier)
    if (H > 0.88 || Math.abs(lat) > 0.7) return { biome: 'snow', ...BIOME_PALETTE.snow };
    return { biome: 'mountain', ...BIOME_PALETTE.mountain };
  }

  // Hill band
  if (H >= BIOME_THRESHOLDS.hill || S > 0.18) {
    return { biome: 'hill', ...BIOME_PALETTE.hill };
  }

  // Forest vs plains by mid-range
  if (H >= BIOME_THRESHOLDS.forest) {
    return { biome: 'forest', ...BIOME_PALETTE.forest };
  }

  // Default: plains
  return { biome: 'plains', ...BIOME_PALETTE.plains };
}

// Helper that accepts generator cell shape { fields: { h, slope } }
export function biomeFromCell(cell, extras = {}) {
  if (!cell || !cell.fields) return { biome: 'plains', ...BIOME_PALETTE.plains };
  const { h, slope } = cell.fields;
  const lat = extras.lat ?? 0;
  return mapBiome({ h, slope, lat });
}

export default { BIOME_THRESHOLDS, mapBiome, biomeFromCell };
