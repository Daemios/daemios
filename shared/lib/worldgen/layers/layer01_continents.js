/**
 * Layer 1 – Continents
 * --------------------
 *
 * This pass is responsible for painting the broad continental shelves and
 * ocean basins. The layer works on top of a small global base height (defined
 * in the world config) so that continents visually rise from the ocean floor
 * instead of pulling some cells down and pushing others up. Subsequent layers
 * will add additional relief and micro detail.
 */

import { WorldCoord } from '../utils/worldCoord.js';
import { TileCache } from '../utils/tileCache.js';
import { initNoise as initNoiseRegistry } from '../../../worldgen/noise.js';

const DEFAULTS = {
  macro: {
    octaves: 4,
    lacunarity: 2.15,
    gain: 0.45,
  },
  mediumDetail: {
    octaves: 3,
    lacunarity: 2.3,
    gain: 0.55,
    amp: 0.18,
    freq: 0.6,
  },
  warpSlow: { freq: 0.08, amp: 0.22 },
  warpFast: { freq: 0.6, amp: 0.05 },
  plate: {
    trenchStrength: 0.18,
    shelfStrength: 0.12,
  },
  // Normalized thresholds that remap the combined macro noise into
  // bathymetry / land heights. Values below oceanFloor map to deep ocean,
  // values between oceanFloor and shoreThreshold blend toward the shoreline,
  // and values above shoreThreshold become land.
  oceanFloor: 0.36,
  shoreThreshold: 0.58,
  oceanPower: 2.35,
  landPower: 1.8,
  gradientSampleDistance: 32,
  // How much of the medium detail survives over deep ocean. 0 -> none, 1 -> full.
  mediumOceanRetention: 0.35,
};

function clamp(value, min, max) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function saturate(value) {
  return clamp(value, 0, 1);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function smoothstep01(t) {
  const x = saturate(t);
  return x * x * (3 - 2 * x);
}

function seedStringToNumber(s) {
  let n = 0;
  for (let i = 0; i < s.length; i++) n = (n * 31 + s.charCodeAt(i)) >>> 0;
  return n || 1;
}

function pseudoRandom(ix, iy, seedNum) {
  const v = Math.sin((ix * 127.1 + iy * 311.7) + seedNum * 12.9898) * 43758.5453;
  return v - Math.floor(v);
}

function ensureContext(ctx) {
  if (!ctx || typeof ctx !== 'object') throw new Error('layer01 requires a context object');

  if (!ctx.coord || !(ctx.coord instanceof WorldCoord)) {
    const hasAxial = Number.isFinite(ctx.q) && Number.isFinite(ctx.r);
    if (hasAxial) ctx.coord = new WorldCoord({ q: ctx.q, r: ctx.r });
    else ctx.coord = WorldCoord.fromWorld(ctx.x ?? 0, ctx.z ?? 0);
  }

  if (!ctx.world || typeof ctx.world.x !== 'number' || typeof ctx.world.y !== 'number') {
    const world = ctx.coord ? ctx.coord.world : { x: ctx.x ?? 0, y: ctx.z ?? 0 };
    ctx.world = world;
  }

  if (!ctx.cache || !(ctx.cache instanceof TileCache)) {
    ctx.cache = new TileCache();
  }
  if (typeof ctx.cacheWarp !== 'function') ctx.cacheWarp = ctx.cache.getWarp.bind(ctx.cache);
  if (typeof ctx.cacheVoronoi !== 'function') ctx.cacheVoronoi = ctx.cache.getVoronoi.bind(ctx.cache);
  if (typeof ctx.cacheValue !== 'function') ctx.cacheValue = ctx.cache.getValue.bind(ctx.cache);

  if (!ctx.noiseRegistry && !ctx.noises) {
    const registry = initNoiseRegistry(ctx.seed ?? '');
    ctx.noiseRegistry = registry;
    ctx.noises = registry;
    ctx.noiseFields = registry;
  }

  if (!ctx.noiseRegistry && ctx.noises) ctx.noiseRegistry = ctx.noises;
  if (!ctx.noises && ctx.noiseRegistry) ctx.noises = ctx.noiseRegistry;

  return ctx;
}

function resolveLayerConfig(ctx) {
  const layerCfg = (ctx?.cfg?.layers?.layer1) || {};
  const globalCfg = (ctx?.cfg?.layers?.global) || {};
  const seaLevel = (typeof globalCfg.seaLevel === 'number')
    ? clamp(globalCfg.seaLevel, 0, 1)
    : clamp(layerCfg.seaLevel ?? 0.22, 0, 1);
  const baseElevation = (typeof ctx?.cfg?.baseElevation === 'number') ? ctx.cfg.baseElevation : 0.01;
  const plateCellSize = (typeof layerCfg.plateCellSize === 'number' && layerCfg.plateCellSize > 0)
    ? layerCfg.plateCellSize
    : 256;
  const continentScale = (typeof layerCfg.continentScale === 'number' && Number.isFinite(layerCfg.continentScale))
    ? layerCfg.continentScale
    : 1;
  const detailCfg = { ...DEFAULTS.mediumDetail, ...(layerCfg.detail || {}) };
  const warpCfg = {
    slow: { ...DEFAULTS.warpSlow, ...(layerCfg.warp?.slow || {}) },
    fast: { ...DEFAULTS.warpFast, ...(layerCfg.warp?.fast || {}) },
  };

  return {
    cfg: layerCfg,
    seaLevel,
    baseElevation,
    plateCellSize,
    continentScale,
    detailCfg,
    warpCfg,
    oceanFloor: typeof layerCfg.oceanFloor === 'number' ? layerCfg.oceanFloor : DEFAULTS.oceanFloor,
    shoreThreshold: typeof layerCfg.shoreThreshold === 'number' ? layerCfg.shoreThreshold : DEFAULTS.shoreThreshold,
    oceanPower: typeof layerCfg.oceanPower === 'number' ? layerCfg.oceanPower : DEFAULTS.oceanPower,
    landPower: typeof layerCfg.landPower === 'number' ? layerCfg.landPower : DEFAULTS.landPower,
    gradientSampleDistance: typeof layerCfg.gradientSampleDistance === 'number'
      ? Math.max(4, layerCfg.gradientSampleDistance)
      : DEFAULTS.gradientSampleDistance,
    mediumOceanRetention: typeof layerCfg.mediumOceanRetention === 'number'
      ? clamp(layerCfg.mediumOceanRetention, 0, 1)
      : DEFAULTS.mediumOceanRetention,
    plate: {
      trenchStrength: typeof layerCfg.trenchStrength === 'number'
        ? layerCfg.trenchStrength
        : DEFAULTS.plate.trenchStrength,
      shelfStrength: typeof layerCfg.shelfStrength === 'number'
        ? layerCfg.shelfStrength
        : DEFAULTS.plate.shelfStrength,
    },
  };
}

function getNoiseSource(ctx, name) {
  const registry = ctx?.noiseRegistry || ctx?.noises;
  if (!registry) return null;
  try {
    if (typeof registry.get === 'function') return registry.get(name);
    const candidate = registry[name];
    if (candidate && typeof candidate.sampleRaw === 'function') return candidate;
    if (candidate && typeof candidate.noise2D === 'function') {
      return {
        sampleRaw(x, y, options = {}) {
          const scale = typeof options.scale === 'number' ? options.scale : 1;
          return candidate.noise2D(x * scale, y * scale);
        }
      };
    }
  } catch (err) {
    return null;
  }
  return null;
}

function sampleFBM(source, x, y, options = {}) {
  if (!source || typeof source.sampleRaw !== 'function') return 0;
  const octaves = Math.max(1, Math.floor(options.octaves ?? DEFAULTS.macro.octaves));
  const lacunarity = options.lacunarity ?? DEFAULTS.macro.lacunarity;
  const gain = options.gain ?? DEFAULTS.macro.gain;
  const baseScale = options.baseScale ?? 1;
  let amplitude = 1;
  let frequency = baseScale;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amplitude * source.sampleRaw(x, y, { scale: frequency });
    norm += amplitude;
    amplitude *= gain;
    frequency *= lacunarity;
  }
  if (norm <= 0) return 0;
  return sum / norm;
}

function sampleWarpVector(ctx, worldX, worldY, name, settings, plateCellSize, useCache = true) {
  const freqBase = 1 / Math.max(16, plateCellSize);
  const frequency = freqBase * (settings?.freq ?? DEFAULTS.warpSlow.freq);
  const amplitude = (settings?.amp ?? DEFAULTS.warpSlow.amp) * plateCellSize;
  const compute = () => {
    const source = getNoiseSource(ctx, name);
    if (!source) return { x: 0, y: 0 };
    const offsetA = 131.7;
    const offsetB = 71.3;
    const sx = source.sampleRaw(worldX + offsetA, worldY - offsetB, { scale: frequency });
    const sy = source.sampleRaw(worldX - offsetB, worldY + offsetA, { scale: frequency });
    return { x: sx * amplitude, y: sy * amplitude };
  };
  if (!useCache || typeof ctx.cacheWarp !== 'function') return compute();
  return ctx.cacheWarp(['layer1', 'warp', name, worldX, worldY, frequency, amplitude], compute);
}

function jitteredPlateCenter(ix, iy, plateSize, seedNum) {
  const pr = pseudoRandom(ix, iy, seedNum);
  const jitterX = (pr - 0.5) * plateSize * 0.6;
  const jitterY = (pseudoRandom(ix, iy + 9999, seedNum) - 0.5) * plateSize * 0.6;
  return {
    x: ix * plateSize + jitterX,
    y: iy * plateSize + jitterY,
    rand: pr,
  };
}

function computePlateContext(ctx, worldX, worldY, plateCellSize, useCache = true) {
  const seedNum = seedStringToNumber(ctx?.seed ?? '');
  const compute = () => {
    const px = Math.round(worldX / plateCellSize);
    const py = Math.round(worldY / plateCellSize);
    let nearest = null;
    let second = null;
    for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        const ix = px + ox;
        const iy = py + oy;
        const center = jitteredPlateCenter(ix, iy, plateCellSize, seedNum);
        const dx = worldX - center.x;
        const dy = worldY - center.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const entry = { ix, iy, center, dist };
        if (!nearest || dist < nearest.dist) {
          second = nearest;
          nearest = entry;
        } else if (!second || dist < second.dist) {
          second = entry;
        }
      }
    }
    if (!nearest) {
      return { id: 0, edgeDistance: 1, edgeDir: { x: 1, y: 0 }, distanceToCenter: 0 };
    }
    const plateId = Math.abs((nearest.ix * 73856093) ^ (nearest.iy * 19349663) ^ seedNum) >>> 0;
    let edgeDistance = 1;
    let edgeDir = { x: 1, y: 0 };
    if (second) {
      const delta = { x: second.center.x - nearest.center.x, y: second.center.y - nearest.center.y };
      const len = Math.sqrt(delta.x * delta.x + delta.y * delta.y) || 1;
      edgeDir = { x: delta.x / len, y: delta.y / len };
      const boundaryDist = Math.max(0, (second.dist - nearest.dist) * 0.5);
      edgeDistance = clamp(boundaryDist / (plateCellSize * 0.5), 0, 1);
    }
    return {
      id: plateId,
      center: nearest.center,
      edgeDistance,
      edgeDir,
      distanceToCenter: nearest.dist,
    };
  };

  if (!useCache || typeof ctx.cacheVoronoi !== 'function') return compute();
  return ctx.cacheVoronoi(['layer1', 'plate', plateCellSize, Math.floor(worldX), Math.floor(worldY)], compute);
}

function combineMacroFields(ctx, worldX, worldY, config, options = {}) {
  const { plateCellSize, warpCfg, detailCfg, continentScale } = config;
  const macroSource = getNoiseSource(ctx, 'macro');
  const mediumSource = getNoiseSource(ctx, 'mediumDetail');

  const warpSlow = sampleWarpVector(ctx, worldX, worldY, 'warpSlow', warpCfg.slow, plateCellSize, options.useCache !== false);
  const warpFast = sampleWarpVector(ctx, worldX, worldY, 'warpFast', warpCfg.fast, plateCellSize, options.useCache !== false);

  const warpedX = worldX + warpSlow.x + warpFast.x;
  const warpedY = worldY + warpSlow.y + warpFast.y;

  const baseFreq = (1 / Math.max(32, plateCellSize)) * continentScale;
  const macroRaw = sampleFBM(macroSource, warpedX, warpedY, {
    baseScale: baseFreq,
    octaves: config.cfg.macroOctaves ?? DEFAULTS.macro.octaves,
    lacunarity: config.cfg.macroLacunarity ?? DEFAULTS.macro.lacunarity,
    gain: config.cfg.macroGain ?? DEFAULTS.macro.gain,
  });
  const macro01 = saturate((macroRaw + 1) * 0.5);

  let mediumContribution = 0;
  if (mediumSource) {
    const detailRaw = sampleFBM(mediumSource, warpedX * 0.9, warpedY * 0.9, {
      baseScale: baseFreq * (detailCfg.freq ?? 0.6),
      octaves: detailCfg.octaves,
      lacunarity: detailCfg.lacunarity,
      gain: detailCfg.gain,
    });
    // Recenter to [-1,1] and apply amplitude.
    const detailNormalized = clamp(detailRaw, -1, 1);
    const oceanAttenuation = macro01 < config.shoreThreshold ? config.mediumOceanRetention : 1;
    mediumContribution = detailNormalized * (detailCfg.amp ?? DEFAULTS.mediumDetail.amp) * oceanAttenuation;
  }

  let plateContribution = 0;
  let plate = null;
  if (options.includePlate !== false) {
    plate = computePlateContext(ctx, worldX, worldY, plateCellSize, options.useCache !== false);
    if (plate) {
      const edgeFactor = Math.pow(1 - plate.edgeDistance, 1.6);
      const isLikelyLand = macro01 >= config.shoreThreshold;
      const strength = isLikelyLand ? config.plate.shelfStrength : -config.plate.trenchStrength;
      plateContribution = strength * edgeFactor;
    }
  }

  const combined = saturate(macro01 + mediumContribution + plateContribution);
  return {
    combined,
    macro01,
    mediumContribution,
    plateContribution,
    warpSlow,
    warpFast,
    plate,
  };
}

function mapToLayerAddition(value01, config) {
  const { seaLevel, baseElevation, oceanFloor, shoreThreshold, oceanPower, landPower } = config;
  const capAbsolute = Math.min(1, seaLevel + 0.05);
  const maxAddition = Math.max(0, capAbsolute - baseElevation);

  const floorThreshold = clamp(oceanFloor, 0, shoreThreshold - 0.01);
  const coastThreshold = clamp(shoreThreshold, floorThreshold + 0.01, 0.99);

  const deepAbsolute = baseElevation + seaLevel * 0.3;
  const shallowAbsolute = baseElevation + seaLevel * 0.9;
  const deepAddition = Math.max(0, deepAbsolute - baseElevation);
  const shallowAddition = Math.max(0, Math.min(seaLevel, shallowAbsolute) - baseElevation);

  let addition = 0;
  if (value01 <= floorThreshold) {
    const t = value01 / Math.max(1e-6, floorThreshold);
    addition = deepAddition * Math.pow(t, oceanPower);
  } else if (value01 <= coastThreshold) {
    const t = (value01 - floorThreshold) / Math.max(1e-6, coastThreshold - floorThreshold);
    addition = lerp(deepAddition, shallowAddition, smoothstep01(t));
  } else {
    const t = (value01 - coastThreshold) / Math.max(1e-6, 1 - coastThreshold);
    addition = lerp(shallowAddition, maxAddition, Math.pow(saturate(t), landPower));
  }

  return clamp(addition, 0, maxAddition);
}

function evaluateContinents(ctx, worldX, worldY, options = {}) {
  const context = ensureContext(ctx);
  const config = resolveLayerConfig(context);
  const fields = combineMacroFields(context, worldX, worldY, config, options);
  const addition = mapToLayerAddition(fields.combined, config);
  const absolute = config.baseElevation + addition;
  const isLand = absolute > config.seaLevel;
  const oceanDepth = isLand ? 0 : Math.max(0, config.seaLevel - absolute);

  return {
    addition,
    absolute,
    combined: fields.combined,
    macro01: fields.macro01,
    components: fields,
    config,
    isLand,
    oceanDepth,
  };
}

function computeGradient(ctx, worldX, worldY, config) {
  const eps = Math.max(4, config.gradientSampleDistance);
  const sample = (dx, dy) => evaluateContinents(ctx, worldX + dx, worldY + dy, { includePlate: false, useCache: false }).absolute;
  const centerLeft = sample(-eps, 0);
  const centerRight = sample(eps, 0);
  const centerDown = sample(0, -eps);
  const centerUp = sample(0, eps);
  const gradX = (centerRight - centerLeft) / (2 * eps);
  const gradY = (centerUp - centerDown) / (2 * eps);
  const magnitude = Math.sqrt(gradX * gradX + gradY * gradY);
  return { grad: { x: gradX, y: gradY }, magnitude };
}

function computeTilePart(ctx) {
  const context = ensureContext(ctx);
  const worldX = context.world.x;
  const worldY = context.world.y;
  const evaluation = evaluateContinents(context, worldX, worldY, { includePlate: true });
  const { config } = evaluation;

  const gradient = computeGradient(context, worldX, worldY, config);

  if (typeof context.cacheValue === 'function') {
    context.cacheValue(['layer1', 'macroElevation', worldX, worldY], () => evaluation.absolute);
    context.cacheValue(['layer1', 'continentScore', worldX, worldY], () => evaluation.combined);
    if (evaluation.components?.plate) {
      context.cacheValue(['layer1', 'plateId', worldX, worldY], () => evaluation.components.plate.id);
      context.cacheValue(['layer1', 'plateEdgeDist', worldX, worldY], () => evaluation.components.plate.edgeDistance);
      context.cacheValue(['layer1', 'plateEdgeDir', worldX, worldY], () => evaluation.components.plate.edgeDir);
    }
    if (evaluation.components?.warpSlow) {
      context.cacheValue(['layer1', 'warpVecSlow', worldX, worldY], () => evaluation.components.warpSlow);
      context.cacheValue(['layer1', 'warpVecFast', worldX, worldY], () => evaluation.components.warpFast);
    }
  }

  const absolute = evaluation.absolute;
  const addition = evaluation.addition;
  const seaLevel = config.seaLevel;
  const depthBand = evaluation.isLand
    ? 'land'
    : (absolute < seaLevel - 0.12 ? 'deep' : 'shallow');

  const plate = evaluation.components?.plate;
  const plateInfo = plate
    ? { id: plate.id, edgeDistance: plate.edgeDistance, edgeDir: plate.edgeDir }
    : { id: null, edgeDistance: 1, edgeDir: { x: 1, y: 0 } };

  return {
    elevation: { raw: addition, normalized: addition },
    macroElevation: absolute,
    continentScore: evaluation.combined,
    isLand: evaluation.isLand,
    oceanDepth: evaluation.oceanDepth,
    bathymetry: { depthBand, seaLevel },
    plate: plateInfo,
    plateId: plateInfo.id,
    plateEdgeDist: plateInfo.edgeDistance,
    plateEdgeDir: plateInfo.edgeDir,
    gradMacro: gradient.grad,
    slope: gradient.magnitude,
  };
}

function fallback(ctx) {
  const context = ensureContext(ctx);
  const { baseElevation, seaLevel } = resolveLayerConfig(context);
  const maxAddition = Math.max(0, Math.min(1, seaLevel + 0.05) - baseElevation);
  const seedNum = seedStringToNumber(context.seed ?? 'fallback');
  const value = Math.abs(Math.sin((context.world.x * 12.9898 + context.world.y * 78.233 + seedNum) * 0.5));
  const addition = maxAddition * Math.pow(value, 3);
  const absolute = baseElevation + addition;
  const isLand = absolute > seaLevel;
  const oceanDepth = isLand ? 0 : Math.max(0, seaLevel - absolute);
  const depthBand = isLand ? 'land' : (absolute < seaLevel - 0.12 ? 'deep' : 'shallow');

  return {
    elevation: { raw: addition, normalized: addition },
    macroElevation: absolute,
    continentScore: value,
    isLand,
    oceanDepth,
    bathymetry: { depthBand, seaLevel },
    plate: { id: 0, edgeDistance: 1, edgeDir: { x: 1, y: 0 } },
    plateId: 0,
    plateEdgeDist: 1,
    plateEdgeDir: { x: 1, y: 0 },
    gradMacro: { x: 0, y: 0 },
    slope: 0,
  };
}

export { computeTilePart, fallback };
