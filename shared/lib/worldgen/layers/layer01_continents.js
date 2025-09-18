// shared/lib/worldgen/layers/layer01_continents.js
// Layer 1: macro geography / plates / ridges.

import { initNoise as initNoiseRegistry } from '../../../worldgen/noise.js';
import { TileCache } from '../utils/tileCache.js';

const DEFAULT_LAYER_CFG = {
  continentalMask: {
    scale: 880,
    power: 1.08,
    remapLow: 0.28,
    remapHigh: 0.74,
    latitudeWeight: 0.18,
    latitudePower: 1.6,
    postBias: -0.08,
    postScale: 1.05,
    clampMin: 0.0,
    clampMax: 1.0
  },
  warp: {
    slow: { amplitude: 240, scale: 0.0016, offset: 37.19 },
    fast: { amplitude: 28, scale: 0.0075, offset: 113.37 }
  },
  plates: {
    cellSize: 420,
    jitter: 0.55,
    relaxation: 0.68,
    edgeNormalization: 1.08,
    interiorBoost: 0.24,
    interiorExponent: 1.32
  },
  ridges: {
    amplitude: 0.42,
    width: 0.42,
    sharpness: 1.55,
    noiseFactor: 0.45,
    trenchThreshold: 0.32,
    trenchStrength: 0.65
  },
  mediumDetail: {
    scale: 210,
    amplitude: 0.32,
    octaves: 2,
    lacunarity: 2.2,
    gain: 0.55,
    coastFadeStart: 0.05,
    coastFadeEnd: 0.3,
    plateFadeStart: 0.1,
    plateFadeEnd: 0.45,
    weightExponent: 1.05
  },
  combine: {
    maskWeight: 1.0,
    ridgeWeight: 1.0,
    detailWeight: 0.65,
    interiorWeight: 0.35,
    maskOffset: -0.05
  },
  normalization: {
    min: -1.1,
    max: 0.96,
    exponent: 1.18,
    clampMin: 0,
    clampMax: 1
  },
  ocean: {
    depthScale: 1.25
  },
  debug: {
    recordMaskPreWarp: true
  }
};

function clamp(value, min, max) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function clamp01(value) {
  return clamp(value, 0, 1);
}

function smoothstep(edge0, edge1, x) {
  if (edge0 === edge1) return x >= edge1 ? 1 : 0;
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function remapClamp(value, inMin, inMax, outMin, outMax) {
  if (inMax === inMin) return clamp(outMin, Math.min(outMin, outMax), Math.max(outMin, outMax));
  const t = clamp01((value - inMin) / (inMax - inMin));
  return lerp(outMin, outMax, t);
}

function signedPow(value, exponent) {
  if (exponent === 1 || exponent === 0) return value;
  const sign = value < 0 ? -1 : 1;
  return sign * Math.pow(Math.abs(value), exponent);
}

function seedStringToNumber(s) {
  let n = 0;
  const str = String(s ?? '');
  for (let i = 0; i < str.length; i += 1) {
    n = (n * 31 + str.charCodeAt(i)) >>> 0;
  }
  return n || 1;
}

function hash2D(ix, iy, seed) {
  const v = Math.sin(ix * 127.1 + iy * 311.7 + seed * 37.719) * 43758.5453;
  return v - Math.floor(v);
}

function hashEdge(a, b, seed) {
  const v = Math.sin(a * 157.31 + b * 263.17 + seed * 11.17) * 43758.5453;
  return (v - Math.floor(v)) * 2 - 1;
}

function ensureNoiseRegistry(ctx) {
  if (ctx.noiseRegistry) return ctx.noiseRegistry;
  const registry = initNoiseRegistry(ctx.seed);
  ctx.noiseRegistry = registry;
  ctx.noises = registry;
  return registry;
}

function ensureTileCache(ctx) {
  if (ctx.cache instanceof TileCache) return ctx.cache;
  const cache = new TileCache();
  ctx.cache = cache;
  ctx.cacheWarp = cache.getWarp.bind(cache);
  ctx.cacheVoronoi = cache.getVoronoi.bind(cache);
  ctx.cacheValue = cache.getValue.bind(cache);
  return cache;
}

function getWorldCoords(ctx) {
  if (ctx.coord && ctx.coord.world) return ctx.coord.world;
  if (ctx.world) return ctx.world;
  return { x: typeof ctx.x === 'number' ? ctx.x : 0, y: typeof ctx.z === 'number' ? ctx.z : 0 };
}

function normalizeLayerConfig(cfg = {}) {
  const maskCfg = Object.assign({}, DEFAULT_LAYER_CFG.continentalMask, cfg.continentalMask || cfg.mask || {});
  const warpCfgRaw = cfg.warp || cfg.domainWarp || {};
  const warpCfg = {
    slow: Object.assign({}, DEFAULT_LAYER_CFG.warp.slow, warpCfgRaw.slow || {}),
    fast: Object.assign({}, DEFAULT_LAYER_CFG.warp.fast, warpCfgRaw.fast || {})
  };
  const platesCfgRaw = cfg.plates || {};
  const platesCfg = Object.assign({}, DEFAULT_LAYER_CFG.plates, platesCfgRaw);
  const ridgesCfgRaw = cfg.ridges || cfg.ridge || {};
  const ridgesCfg = Object.assign({}, DEFAULT_LAYER_CFG.ridges, ridgesCfgRaw);
  const detailCfgRaw = cfg.mediumDetail || cfg.detail || {};
  const detailCfg = Object.assign({}, DEFAULT_LAYER_CFG.mediumDetail, detailCfgRaw);
  const combineCfgRaw = cfg.combine || {};
  const combineCfg = Object.assign({}, DEFAULT_LAYER_CFG.combine, combineCfgRaw);
  const normalizationCfgRaw = cfg.normalization || {};
  const normalizationCfg = Object.assign({}, DEFAULT_LAYER_CFG.normalization, normalizationCfgRaw);
  const oceanCfgRaw = cfg.ocean || {};
  const oceanCfg = Object.assign({}, DEFAULT_LAYER_CFG.ocean, oceanCfgRaw);
  const debugCfgRaw = cfg.debug || {};
  const debugCfg = Object.assign({}, DEFAULT_LAYER_CFG.debug, debugCfgRaw);
  return {
    continentalMask: maskCfg,
    warp: warpCfg,
    plates: platesCfg,
    ridges: ridgesCfg,
    mediumDetail: detailCfg,
    combine: combineCfg,
    normalization: normalizationCfg,
    ocean: oceanCfg,
    debug: debugCfg
  };
}

function sampleMask(noiseSource, world, cfg, latitudeNorm = 0) {
  const scale = Math.max(1e-6, cfg.scale || DEFAULT_LAYER_CFG.continentalMask.scale);
  const sx = world.x / scale;
  const sy = world.y / scale;
  const sample = noiseSource.sampleRaw(sx, sy);
  let value = (sample + 1) * 0.5;
  if (cfg.power && Number.isFinite(cfg.power) && cfg.power !== 1) value = Math.pow(clamp01(value), cfg.power);
  const latWeight = clamp01(cfg.latitudeWeight || 0);
  if (latWeight > 0) {
    const latPow = Number.isFinite(cfg.latitudePower) ? cfg.latitudePower : 1.5;
    const latAttenuation = 1 - latWeight * Math.pow(Math.abs(latitudeNorm), latPow);
    value *= clamp(latAttenuation, 0.2, 1.0);
  }
  value = value * (cfg.postScale ?? 1) + (cfg.postBias ?? 0);
  return clamp(value, cfg.clampMin ?? 0, cfg.clampMax ?? 1);
}

function computeWarp(ctx, world, cfg, sourceName, cacheKey) {
  const registry = ensureNoiseRegistry(ctx);
  const cache = ensureTileCache(ctx);
  const cacheId = cacheKey || `layer1:warp:${sourceName}`;
  const warper = () => {
    const source = registry.getSource(sourceName);
    const scale = Math.max(1e-6, cfg.scale || 0.001);
    const amp = cfg.amplitude || 0;
    const offset = cfg.offset || 0;
    const sx = world.x * scale + offset;
    const sy = world.y * scale - offset;
    const wx = source.sampleRaw(sx, sy);
    const wy = source.sampleRaw(sx + 200.37, sy + 137.11);
    const dx = wx * amp;
    const dy = wy * amp;
    return {
      offsetX: dx,
      offsetY: dy,
      warpedX: world.x + dx,
      warpedY: world.y + dy
    };
  };
  return cache.getWarp(cacheId, warper);
}

function normalizeVector(x, y) {
  const len = Math.sqrt(x * x + y * y) || 1;
  return { x: x / len, y: y / len, length: len };
}

function computePlateField(ctx, world, cfg, seedNum) {
  const cache = ensureTileCache(ctx);
  const cacheKey = `layer1:plateField`;
  return cache.getVoronoi(cacheKey, () => {
    const cellSize = Math.max(16, cfg.cellSize || DEFAULT_LAYER_CFG.plates.cellSize);
    const jitter = clamp(cfg.jitter ?? DEFAULT_LAYER_CFG.plates.jitter, 0, 1);
    const relax = clamp(cfg.relaxation ?? DEFAULT_LAYER_CFG.plates.relaxation, 0, 1);
    const px = world.x / cellSize;
    const py = world.y / cellSize;
    const ix = Math.floor(px);
    const iy = Math.floor(py);
    let nearest = { dist: Infinity };
    let second = { dist: Infinity };
    const neighbors = [];

    for (let oy = -1; oy <= 1; oy += 1) {
      for (let ox = -1; ox <= 1; ox += 1) {
        const cx = ix + ox;
        const cy = iy + oy;
        const jitterX = (hash2D(cx, cy, seedNum) - 0.5) * jitter;
        const jitterY = (hash2D(cx, cy, seedNum + 1) - 0.5) * jitter;
        const centerX = (cx + 0.5 + jitterX * relax) * cellSize;
        const centerY = (cy + 0.5 + jitterY * relax) * cellSize;
        const dx = world.x - centerX;
        const dy = world.y - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const id = Math.floor(hash2D(cx, cy, seedNum + 1013) * 1_000_000);
        const entry = { dist, centerX, centerY, id, gridX: cx, gridY: cy };
        neighbors.push(entry);
        if (dist < nearest.dist) {
          second = nearest;
          nearest = entry;
        } else if (dist < second.dist) {
          second = entry;
        }
      }
    }

    const cellRadius = cellSize * 0.5;
    const edgeDistance = second.dist < Infinity ? Math.max(0, (second.dist - nearest.dist) * 0.5) : cellRadius;
    const edgeNormalization = Math.max(1e-6, cfg.edgeNormalization || DEFAULT_LAYER_CFG.plates.edgeNormalization);
    const edgeNormalized = clamp(edgeDistance / (cellRadius * edgeNormalization), 0, 1);
    const direction = second.dist < Infinity
      ? normalizeVector(second.centerX - nearest.centerX, second.centerY - nearest.centerY)
      : { x: 0, y: 0, length: 0 };
    const ridgeSeed = Math.floor(hash2D(nearest.gridX, nearest.gridY, seedNum + 709) * 1_000_000);
    return {
      id: nearest.id,
      nearest,
      second,
      edgeDistance,
      edgeNormalized,
      direction,
      ridgeSeed,
      neighbors
    };
  });
}

function computeRidgeField(plateField, cfg, seedNum) {
  const width = clamp(cfg.width ?? DEFAULT_LAYER_CFG.ridges.width, 0.05, 1.0);
  const sharpness = clamp(cfg.sharpness ?? DEFAULT_LAYER_CFG.ridges.sharpness, 0.5, 4);
  const base = Math.max(0, 1 - Math.pow(clamp01(plateField.edgeNormalized / width), sharpness));
  const boundaryNoise = hashEdge(plateField.nearest.id + seedNum, plateField.second.id + seedNum, seedNum);
  const noiseInfluence = cfg.noiseFactor ?? DEFAULT_LAYER_CFG.ridges.noiseFactor;
  const noisy = clamp01(base * (1 + boundaryNoise * noiseInfluence));
  const trenchThreshold = clamp01(cfg.trenchThreshold ?? DEFAULT_LAYER_CFG.ridges.trenchThreshold);
  const trenchStrength = clamp(cfg.trenchStrength ?? DEFAULT_LAYER_CFG.ridges.trenchStrength, 0, 2);
  const isTrench = boundaryNoise < -trenchThreshold;
  const magnitude = noisy;
  const signed = isTrench ? -magnitude * trenchStrength : magnitude;
  return {
    magnitude,
    signed,
    isTrench,
    boundaryNoise
  };
}

function computeMediumDetail(ctx, world, maskValue, seaLevel, plateField, cfg) {
  const registry = ensureNoiseRegistry(ctx);
  const source = registry.getSource('mediumDetail');
  const scale = Math.max(1e-6, cfg.scale || DEFAULT_LAYER_CFG.mediumDetail.scale);
  const octaves = Math.max(1, Math.floor(cfg.octaves ?? DEFAULT_LAYER_CFG.mediumDetail.octaves));
  const lacunarity = cfg.lacunarity ?? DEFAULT_LAYER_CFG.mediumDetail.lacunarity;
  const gain = cfg.gain ?? DEFAULT_LAYER_CFG.mediumDetail.gain;
  let amplitude = 1;
  let frequency = 1;
  let sum = 0;
  let totalAmp = 0;
  for (let i = 0; i < octaves; i += 1) {
    const sx = (world.x / scale) * frequency + i * 37.19;
    const sy = (world.y / scale) * frequency - i * 71.63;
    const sample = source.sampleRaw(sx, sy);
    sum += sample * amplitude;
    totalAmp += amplitude;
    amplitude *= gain;
    frequency *= lacunarity;
  }
  const fbm = totalAmp > 0 ? sum / totalAmp : sum;
  const coastDistance = Math.abs(maskValue - seaLevel);
  const coastWeight = smoothstep(cfg.coastFadeStart ?? 0.05, cfg.coastFadeEnd ?? 0.3, coastDistance);
  const plateWeight = smoothstep(cfg.plateFadeStart ?? 0.1, cfg.plateFadeEnd ?? 0.45, plateField.edgeNormalized);
  const weightExponent = cfg.weightExponent ?? 1;
  const weight = Math.pow(coastWeight * plateWeight, weightExponent);
  const contribution = fbm * (cfg.amplitude ?? DEFAULT_LAYER_CFG.mediumDetail.amplitude) * weight;
  return { fbm, contribution, weight, coastWeight, plateWeight };
}

function computeTilePart(ctx) {
  const cfgRaw = (ctx && ctx.cfg && ctx.cfg.layers && ctx.cfg.layers.layer1) ? ctx.cfg.layers.layer1 : {};
  const cfg = normalizeLayerConfig(cfgRaw);
  const registry = ensureNoiseRegistry(ctx);
  ensureTileCache(ctx);
  const world = getWorldCoords(ctx);
  const coord = ctx.coord;
  const latitudeNorm = coord && typeof coord.latitudeNormalized === 'number' ? coord.latitudeNormalized : 0;
  const seaLevel = (ctx && ctx.cfg && ctx.cfg.layers && ctx.cfg.layers.global && typeof ctx.cfg.layers.global.seaLevel === 'number')
    ? ctx.cfg.layers.global.seaLevel
    : (typeof cfgRaw.seaLevel === 'number' ? cfgRaw.seaLevel : 0.5);

  const macroSource = registry.getSource('macro');
  const seedNum = seedStringToNumber(ctx.seed);

  const maskPreWarp = cfg.debug.recordMaskPreWarp
    ? sampleMask(macroSource, world, cfg.continentalMask, latitudeNorm)
    : null;

  const slowWarp = computeWarp(ctx, world, cfg.warp.slow, 'warpSlow', 'layer1:warp:slow');
  const fastWarp = computeWarp(ctx, world, cfg.warp.fast, 'warpFast', 'layer1:warp:fast');
  const warped = {
    x: world.x + slowWarp.offsetX + fastWarp.offsetX,
    y: world.y + slowWarp.offsetY + fastWarp.offsetY
  };

  const maskPostWarp = sampleMask(macroSource, warped, cfg.continentalMask, latitudeNorm);
  const maskSigned = remapClamp(maskPostWarp, cfg.continentalMask.remapLow ?? 0.25, cfg.continentalMask.remapHigh ?? 0.75, -1, 1);

  const plateField = computePlateField(ctx, warped, cfg.plates, seedNum);
  const ridgeField = computeRidgeField(plateField, cfg.ridges, seedNum);
  const medium = computeMediumDetail(ctx, warped, maskPostWarp, seaLevel, plateField, cfg.mediumDetail);

  const interiorPower = cfg.plates.interiorExponent ?? DEFAULT_LAYER_CFG.plates.interiorExponent;
  const interiorBase = Math.pow(clamp01(1 - plateField.edgeNormalized), interiorPower);
  const maskContribution = (maskSigned + (cfg.combine.maskOffset || 0)) * (cfg.combine.maskWeight || 1);
  const ridgeContribution = ridgeField.signed * (cfg.ridges.amplitude ?? DEFAULT_LAYER_CFG.ridges.amplitude) * (cfg.combine.ridgeWeight || 1);
  const detailContribution = medium.contribution * (cfg.combine.detailWeight || 1);
  const interiorContribution = interiorBase * (cfg.plates.interiorBoost ?? DEFAULT_LAYER_CFG.plates.interiorBoost) * (cfg.combine.interiorWeight ?? DEFAULT_LAYER_CFG.combine.interiorWeight);

  let signedElevation = maskContribution + ridgeContribution + detailContribution + interiorContribution;
  signedElevation = clamp(signedElevation, cfg.normalization.min ?? -1, cfg.normalization.max ?? 1);
  signedElevation = signedPow(signedElevation, cfg.normalization.exponent ?? 1);
  const normalized = clamp01(remapClamp(signedElevation, cfg.normalization.min ?? -1, cfg.normalization.max ?? 1, 0, 1));

  const oceanDepth = normalized < seaLevel
    ? (seaLevel - normalized) * (cfg.ocean.depthScale ?? 1)
    : 0;
  const ridgeStrength = clamp01(Math.abs(ridgeField.signed));
  const depthBand = normalized <= seaLevel
    ? (normalized < seaLevel - 0.12 ? 'deep' : 'shallow')
    : 'land';
  const slope = clamp01(Math.abs(medium.fbm) * 0.4 + ridgeStrength * 0.75);

  if (typeof ctx.cacheValue === 'function') {
    ctx.cacheValue('layer1:macroElevation', normalized);
    ctx.cacheValue('layer1:maskPreWarp', maskPreWarp);
    ctx.cacheValue('layer1:maskPostWarp', maskPostWarp);
    ctx.cacheValue('layer1:plateId', plateField.id);
    ctx.cacheValue('layer1:plateEdge', plateField.edgeNormalized);
    ctx.cacheValue('layer1:ridgeStrength', ridgeStrength);
    ctx.cacheValue('layer1:oceanDepth', oceanDepth);
  }

  const part = {
    elevation: { raw: normalized, normalized },
    bathymetry: { seaLevel, depthBand },
    slope,
    macroElevation: normalized,
    plateId: plateField.id,
    ridgeStrength,
    oceanDepth,
    plate: {
      id: plateField.id,
      edgeDistance: plateField.edgeNormalized,
      ridgeStrength,
      ridgeSign: ridgeField.signed >= 0 ? 1 : -1,
      ridgeContribution,
      ridgeSeed: plateField.ridgeSeed,
      normal: { x: plateField.direction.x, y: plateField.direction.y }
    },
    macro: {
      maskPreWarp,
      maskPostWarp,
      signedElevation,
      contributions: {
        mask: maskContribution,
        ridge: ridgeContribution,
        detail: detailContribution,
        interior: interiorContribution
      },
      warp: {
        slow: { offsetX: slowWarp.offsetX, offsetY: slowWarp.offsetY },
        fast: { offsetX: fastWarp.offsetX, offsetY: fastWarp.offsetY },
        warped
      },
      mediumDetail: medium,
      ridge: ridgeField,
      plate: plateField
    },
    debug: {
      overlays: {
        continentalMaskPre: maskPreWarp,
        continentalMaskPost: maskPostWarp,
        plateEdgeDistance: plateField.edgeNormalized,
        ridgeStrength,
        oceanDepth
      },
      histograms: {
        macroElevation: normalized,
        oceanDepth
      }
    }
  };

  return part;
}

function fallback(ctx) {
  const world = getWorldCoords(ctx);
  const base = (Math.sin(world.x * 0.0007 + world.y * 0.00033) + 1) * 0.5;
  const normalized = clamp01(base * 0.6);
  const seaLevel = (ctx && ctx.cfg && ctx.cfg.layers && ctx.cfg.layers.global && typeof ctx.cfg.layers.global.seaLevel === 'number')
    ? ctx.cfg.layers.global.seaLevel
    : 0.5;
  const depthBand = normalized <= seaLevel ? (normalized < seaLevel - 0.12 ? 'deep' : 'shallow') : 'land';
  return {
    elevation: { raw: normalized, normalized },
    bathymetry: { seaLevel, depthBand },
    slope: 0,
    macroElevation: normalized,
    ridgeStrength: 0,
    oceanDepth: normalized < seaLevel ? (seaLevel - normalized) : 0,
    plateId: Math.floor((world.x + world.y) % 1000),
    plate: { id: Math.floor((world.x + world.y) % 1000), edgeDistance: 1, ridgeStrength: 0, ridgeSign: 0, ridgeContribution: 0 }
  };
}

export { computeTilePart, fallback };

