// shared/lib/worldgen/config.js
// Default configuration and layer toggles (kept minimal and JSON-serializable)

let layersConfig = {};
try {
  // Try JSON import with assertion (works in bundlers and Node with support)
  // @ts-ignore
  const mod = await import('./layers_config.json', { assert: { type: 'json' } });
  layersConfig = mod.default || mod;
} catch (e) {
  try {
    // Fallback: read file directly (Node runtime). Use import.meta.url to resolve path.
    const fs = await import('fs');
    const url = new URL('./layers_config.json', import.meta.url);
    const txt = fs.readFileSync(url, 'utf8');
    layersConfig = JSON.parse(txt);
  } catch (err) {
    layersConfig = {};
  }
}

export const DEFAULT_CONFIG = {
  // Global multiplier applied to the final elevation (rendered height).
  // This does not change biome/sea classification which is computed from
  // the unscaled elevation; it only scales the returned tile.height.
  scale: 4.0,
  layers: {
    layer0: {
      paletteId: 'default'
    },
  // Layer defaults are centralized in layers_config.json to make tuning easier.
  layer1: Object.assign({}, (layersConfig.layer1 || {})),
  layer2: Object.assign({}, (layersConfig.layer2 || {})),
    layer3: {
      ecotoneThreshold: 0.25
    },
    layer3_5: {
      clutterDensity: 8
    },
    layer4: {
      rarityMultiplier: 1.0
    },
    layer5: {
      mountainExaggeration: 1.5,
      snowlineBias: -0.08
    }
  },
  visual_style: {
    global_saturation: 1.15,
    global_contrast: 1.10,
    fog_strength: 0.4,
    mountain_exaggeration: 1.5,
    snowline_bias: -0.08
  }
};

// ESM export already provided above.
