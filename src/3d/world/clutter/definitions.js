// Clutter type and biome rule definitions for initial pass.
export const CLUTTER_TYPES = [
  {
    id: 'tree_pine',
    model: '/models/clutter/tree-pine.glb',
    category: 'flora',
  desiredRadius: 0.35, // relative to layoutRadius
  baseColor: 0x2f7f4f,
    yLift: 0.02, // add small lift above ground
    scale: { min: 0.7, max: 1.2 },
    rotation: { yawRandom: true },
    biomes: {
      snow: { density: 0.10, maxPerTile: 6 },
      mountain: { density: 0.08, maxPerTile: 3 },
      highland: { density: 0.18, maxPerTile: 8 },
      lowland: { density: 0.10, maxPerTile: 5 },
    },
  },
  {
    id: 'tree_dead',
    model: '/models/clutter/tree-dead.glb',
    category: 'flora',
    desiredRadius: 0.32,
    baseColor: 0x8b7d7b,
    yLift: 0.02,
    scale: { min: 0.7, max: 1.1 },
    rotation: { yawRandom: true },
    biomes: {
      tundra: { density: 0.18, maxPerTile: 7 },
      snow: { density: 0.10, maxPerTile: 5 },
      highland: { density: 0.06, maxPerTile: 2 },
      // Add more biomes if desired (e.g., wasteland, dead_forest)
    },
  },
  {
    id: 'tree_round',
    model: '/models/clutter/tree-round.glb',
    category: 'flora',
  desiredRadius: 0.38,
  baseColor: 0x5fae4d,
    yLift: 0.02,
    scale: { min: 0.8, max: 1.4 },
    rotation: { yawRandom: true },
    biomes: {
      lowland: { density: 0.26, maxPerTile: 10 },
      highland: { density: 0.12, maxPerTile: 7 },
      beach: { density: 0.03, maxPerTile: 2 },
    },
  },
  {
    id: 'rock_pillar',
    model: '/models/clutter/rock-pillar.glb',
    category: 'poi',
  desiredRadius: 0.28,
  baseColor: 0x9aa0a6,
    yLift: 0.01,
    scale: { min: 0.8, max: 1.1 },
    rotation: { yawRandom: true },
    biomes: {
      lowland: { density: 0.006, maxPerTile: 1 },
      highland: { density: 0.014, maxPerTile: 1 },
      mountain: { density: 0.020, maxPerTile: 1 },
      beach: { density: 0.006, maxPerTile: 1 },
    },
  },
];

export const CLUTTER_SETTINGS = {
  enabled: true,
  densityMultiplier: 1.0,
  avoidEdges: 0.8, // tighter margin to avoid overhangs
  collisionFactorFlora: 0.9, // loosen tree spacing a bit for testing (1.0 is base radius)
};
