// shared/lib/worldgen/layers/layer01_continents.js
// Layer 1: macro geography (continents, plates, ridges, macro elevation fields)

import { getNoiseRegistry } from '../noiseRegistry.js';
import { WorldCoord } from '../worldCoord.js';

const DEFAULT_HEX_OPTS = { hexSize: 2.0, spacing: 1.0 };

function clamp01(v) {
  if (v <= 0) return 0;
  if (v >= 1) return 1;
  return v;
}

function clamp(v, min, max) {
  if (v < min) return min;
  if (v > max) return max;
  return v;
}

function hashString(...args) {
  let h = 2166136261 >>> 0;
  for (const arg of args) {
    const str = String(arg || '');
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
  }
  return h >>> 0;
}

function hashToUnit(...args) {
  return hashString(...args) / 4294967295;
}

function ensureCoord(ctx) {
  if (ctx && ctx.coord instanceof WorldCoord) return ctx.coord;
  const q = typeof ctx.q === 'number' ? ctx.q : 0;
  const r = typeof ctx.r === 'number' ? ctx.r : 0;
  const coord = new WorldCoord(q, r, DEFAULT_HEX_OPTS);
  if (ctx) {
    ctx.coord = coord;
    ctx.x = coord.x;
    ctx.z = coord.y;
  }
  return coord;
}

function getRegistry(ctx) {
  if (ctx && ctx.noiseRegistry) return ctx.noiseRegistry;
  const reg = getNoiseRegistry(ctx ? ctx.seed : '');
  if (ctx) ctx.noiseRegistry = reg;
  return reg;
}

function getTileCache(ctx) {
  if (ctx && ctx.tileCache) return ctx.tileCache;
  if (ctx) ctx.tileCache = {};
  return ctx ? ctx.tileCache : {};
}

function computeWarpVector(cache, registry, name, baseX, baseY, cfg = {}) {
  const cacheKey = `warp_${name}`;
  if (cache[cacheKey]) return cache[cacheKey];
  const simplex = registry.getSimplex(name);
  const freq = typeof cfg.freq === 'number' ? cfg.freq : 0.0025;
  const amp = typeof cfg.amp === 'number' ? cfg.amp : 12;
  const x = simplex.noise2D(baseX * freq, baseY * freq) * amp;
  const y = simplex.noise2D((baseX + 200) * freq, (baseY + 200) * freq) * amp;
  const vec = { x, y, freq, amp };
  cache[cacheKey] = vec;
  return vec;
}

function computePlateField(cache, registry, ctx, coords, cfg = {}) {
  if (cache.plateField) return cache.plateField;
  const density = Math.max(1e-5, typeof cfg.density === 'number' ? cfg.density : (1 / Math.max(1, cfg.plateCellSize || 512)));
  const relaxation = clamp01(typeof cfg.relaxation === 'number' ? cfg.relaxation : 0.75);
  const seedKey = hashString(ctx.seed || 'seed', 'plate');
  const sampleX = coords.x * density;
  const sampleY = coords.y * density;
  const ix = Math.floor(sampleX);
  const iy = Math.floor(sampleY);
  let nearest = { dist: Infinity, id: null, siteX: 0, siteY: 0 };
  let second = { dist: Infinity, id: null, siteX: 0, siteY: 0 };
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const cx = ix + dx;
      const cy = iy + dy;
      const jitterX = (hashToUnit(seedKey, cx, cy, 'jx') - 0.5) * relaxation;
      const jitterY = (hashToUnit(seedKey, cx, cy, 'jy') - 0.5) * relaxation;
      const siteX = cx + jitterX;
      const siteY = cy + jitterY;
      const ddx = sampleX - siteX;
      const ddy = sampleY - siteY;
      const dist = Math.sqrt(ddx * ddx + ddy * ddy);
      if (dist < nearest.dist) {
        second = nearest;
        nearest = { dist, id: `${cx}_${cy}`, siteX, siteY };
      } else if (dist < second.dist) {
        second = { dist, id: `${cx}_${cy}`, siteX, siteY };
      }
    }
  }
  const centerX = nearest.siteX / density;
  const centerY = nearest.siteY / density;
  const distToCenter = Math.sqrt((coords.x - centerX) ** 2 + (coords.y - centerY) ** 2);
  let edgeDistance = 0;
  if (second.dist < Infinity) {
    const rawEdge = Math.max(0, (second.dist - nearest.dist) * 0.5);
    edgeDistance = rawEdge / density;
  }
  const edgeDistanceNormalized = clamp01(edgeDistance * density * 2);
  const nx = coords.x - centerX;
  const ny = coords.y - centerY;
  const len = Math.hypot(nx, ny) || 1;
  const normal = { x: nx / len, y: ny / len };
  const plateId = hashString(ctx.seed || 'seed', nearest.id) & 0x7fffffff;
  const neighborPlateId = second.id ? (hashString(ctx.seed || 'seed', second.id) & 0x7fffffff) : plateId;
  const result = {
    plateId,
    neighborPlateId,
    edgeDistance,
    edgeDistanceNormalized,
    distToCenter,
    center: { x: centerX, y: centerY },
    normal,
    raw: { nearest, second }
  };
  cache.plateField = result;
  return result;
}

function computeBoundarySign(seed, plateId, neighborId, trenchChance = 0.25) {
  if (!neighborId || neighborId === plateId) return 1;
  const h = hashToUnit(seed, plateId, neighborId, 'boundary');
  return h < trenchChance ? -1 : 1;
}

function computeTilePart(ctx) {
  const cfg = (ctx && ctx.cfg && ctx.cfg.layers && ctx.cfg.layers.layer1) ? ctx.cfg.layers.layer1 : {};
  const coord = ensureCoord(ctx);
  const registry = getRegistry(ctx);
  const cache = getTileCache(ctx);

  const baseCart = coord.getCartesian();
  const baseX = baseCart.x;
  const baseY = baseCart.y;

  const maskCfg = cfg.continentalMask || {};
  const maskFreq = typeof maskCfg.frequency === 'number' ? maskCfg.frequency : 0.0035;
  const maskFbm = registry.getFbm('macro', {
    octaves: maskCfg.octaves || 4,
    lacunarity: maskCfg.lacunarity || 1.9,
    gain: maskCfg.gain || 0.45
  });

  const preWarpSample = maskFbm(baseX * maskFreq, baseY * maskFreq);
  const maskPreWarp = clamp01((preWarpSample + 1) / 2);

  const warpCfg = cfg.warp || {};
  const slowWarp = computeWarpVector(cache, registry, 'warpSlow', baseX, baseY, warpCfg.slow || {});
  const fastWarp = computeWarpVector(cache, registry, 'warpFast', baseX, baseY, warpCfg.fast || {});

  const warpedX = baseX + slowWarp.x + fastWarp.x;
  const warpedY = baseY + slowWarp.y + fastWarp.y;
  const warpedSample = maskFbm(warpedX * maskFreq, warpedY * maskFreq);
  let maskPostWarp = clamp01((warpedSample + 1) / 2);
  if (typeof maskCfg.offset === 'number') maskPostWarp = clamp01(maskPostWarp + maskCfg.offset);
  if (typeof maskCfg.exponent === 'number' && maskCfg.exponent !== 1) {
    maskPostWarp = Math.pow(maskPostWarp, maskCfg.exponent);
  }

  const plateCfg = cfg.plates || {};
  const plateCoords = {
    x: baseX + slowWarp.x * (typeof plateCfg.warpContribution === 'number' ? plateCfg.warpContribution : 0.6),
    y: baseY + slowWarp.y * (typeof plateCfg.warpContribution === 'number' ? plateCfg.warpContribution : 0.6)
  };
  const plateField = computePlateField(cache, registry, ctx, plateCoords, Object.assign({}, plateCfg, { plateCellSize: cfg.plateCellSize }));

  const ridgeCfg = (plateCfg && plateCfg.ridge) ? plateCfg.ridge : {};
  const ridgeFbm = registry.getFbm('macroRidge', {
    octaves: ridgeCfg.octaves || 3,
    lacunarity: ridgeCfg.lacunarity || 2.0,
    gain: ridgeCfg.gain || 0.55
  });
  const ridgeFreq = typeof ridgeCfg.frequency === 'number' ? ridgeCfg.frequency : 0.008;
  const ridgeNoise = ridgeFbm(warpedX * ridgeFreq, warpedY * ridgeFreq);
  const ridgeNoiseNorm = 0.5 + 0.5 * ridgeNoise;
  const edgeProximity = 1 - clamp01(plateField.edgeDistanceNormalized);
  const ridgeSharpness = typeof ridgeCfg.sharpness === 'number' ? ridgeCfg.sharpness : 2.0;
  const ridgeBase = Math.pow(edgeProximity, ridgeSharpness);
  const ridgeMix = typeof ridgeCfg.noiseMix === 'number' ? ridgeCfg.noiseMix : 0.7;
  const ridgeStrength = clamp01(ridgeBase * (ridgeMix * ridgeNoiseNorm + (1 - ridgeMix)));
  const boundarySign = computeBoundarySign(ctx.seed || 'seed', plateField.plateId, plateField.neighborPlateId, ridgeCfg.trenchChance || 0.25);
  const ridgeAmplitude = typeof ridgeCfg.amplitude === 'number' ? ridgeCfg.amplitude : 0.5;
  const trenchMultiplier = typeof ridgeCfg.trenchMultiplier === 'number' ? ridgeCfg.trenchMultiplier : 0.6;
  const ridgeContribution = ridgeStrength * ridgeAmplitude * (boundarySign < 0 ? -trenchMultiplier : 1);

  const detailCfg = cfg.mediumDetail || {};
  const detailFbm = registry.getFbm('mediumDetail', {
    octaves: detailCfg.octaves || 3,
    lacunarity: detailCfg.lacunarity || 2.1,
    gain: detailCfg.gain || 0.45
  });
  const detailFreq = typeof detailCfg.frequency === 'number' ? detailCfg.frequency : 0.03;
  const detailAmp = typeof detailCfg.amplitude === 'number' ? detailCfg.amplitude : 0.18;
  const detailSample = detailFbm((warpedX + plateField.normal.x * 5) * detailFreq, (warpedY + plateField.normal.y * 5) * detailFreq);
  const seaLevel = (cfg.ocean && typeof cfg.ocean.seaLevel === 'number' && cfg.ocean.seaLevel !== null)
    ? cfg.ocean.seaLevel
    : (ctx && ctx.cfg && ctx.cfg.layers && ctx.cfg.layers.global && typeof ctx.cfg.layers.global.seaLevel === 'number'
      ? ctx.cfg.layers.global.seaLevel
      : 0.2);
  const coastFalloff = typeof detailCfg.coastDampDistance === 'number' ? detailCfg.coastDampDistance : 0.08;
  const coastPower = typeof detailCfg.coastDampPower === 'number' ? detailCfg.coastDampPower : 1.5;
  const edgePower = typeof detailCfg.plateEdgeDampPower === 'number' ? detailCfg.plateEdgeDampPower : 1.2;
  const coastDist = Math.min(1, Math.abs(maskPostWarp - seaLevel) / Math.max(1e-4, coastFalloff));
  const coastWeight = 1 - Math.pow(clamp01(coastDist), coastPower);
  const edgeWeight = Math.pow(clamp01(plateField.edgeDistanceNormalized), edgePower);
  const detailContribution = detailSample * detailAmp * coastWeight * edgeWeight;

  const combineCfg = cfg.combine || {};
  const maskWeight = typeof combineCfg.maskWeight === 'number' ? combineCfg.maskWeight : 0.65;
  const ridgeWeight = typeof combineCfg.ridgeWeight === 'number' ? combineCfg.ridgeWeight : 0.2;
  const detailWeight = typeof combineCfg.detailWeight === 'number' ? combineCfg.detailWeight : 0.15;
  const combineBias = typeof combineCfg.bias === 'number' ? combineCfg.bias : 0;

  const maskRaw = maskPostWarp * 2 - 1;
  let rawElevation = maskRaw * maskWeight + ridgeContribution * ridgeWeight + detailContribution * detailWeight + combineBias;
  const normalization = cfg.normalization || {};
  const minRaw = typeof normalization.min === 'number' ? normalization.min : -1;
  const maxRaw = typeof normalization.max === 'number' ? normalization.max : 1;
  if (normalization.clamp !== false) rawElevation = clamp(rawElevation, minRaw, maxRaw);
  let normalizedElevation = (rawElevation - minRaw) / Math.max(1e-9, (maxRaw - minRaw));
  normalizedElevation = clamp01(normalizedElevation);
  if (typeof combineCfg.postExponent === 'number' && combineCfg.postExponent !== 1) {
    normalizedElevation = Math.pow(normalizedElevation, combineCfg.postExponent);
  }

  const depthScale = (cfg.ocean && typeof cfg.ocean.depthScale === 'number') ? cfg.ocean.depthScale : 1.5;
  const trenchDepthMult = (cfg.ocean && typeof cfg.ocean.trenchDepthMultiplier === 'number') ? cfg.ocean.trenchDepthMultiplier : 1.4;
  let oceanDepth = Math.max(0, seaLevel - normalizedElevation) * depthScale;
  if (boundarySign < 0) oceanDepth *= trenchDepthMult;

  const depthBand = normalizedElevation <= seaLevel ? (normalizedElevation < seaLevel - 0.12 ? 'deep' : 'shallow') : 'land';

  const macroData = {
    maskPreWarp: maskCfg.recordPreWarp ? maskPreWarp : undefined,
    maskPostWarp,
    warped: { x: warpedX, y: warpedY },
    slowWarp,
    fastWarp,
    plate: {
      id: plateField.plateId,
      neighborId: plateField.neighborPlateId,
      edgeDistance: plateField.edgeDistance,
      edgeDistanceNormalized: plateField.edgeDistanceNormalized,
      normal: plateField.normal,
    },
    ridge: {
      strength: ridgeStrength,
      contribution: ridgeContribution,
      sign: boundarySign,
    },
    detail: {
      contribution: detailContribution,
      coastWeight,
      edgeWeight,
    },
    rawElevation,
    normalizedElevation,
    oceanDepth,
    seaLevel,
  };
  cache.macro = macroData;

  return {
    elevation: { raw: normalizedElevation, normalized: normalizedElevation },
    bathymetry: { depthBand, seaLevel, oceanDepth },
    slope: 0,
    plate: { id: plateField.plateId, edgeDistance: plateField.edgeDistanceNormalized },
    macroElevation: normalizedElevation,
    ridgeStrength: ridgeStrength,
    oceanDepth,
    macro: macroData,
  };
}

function fallback(ctx) {
  const coord = ensureCoord(ctx);
  const base = Math.abs(Math.sin((coord.x * 0.01) + (coord.y * 0.012)) * 0.5 + 0.5);
  const seaLevel = (ctx && ctx.cfg && ctx.cfg.layers && ctx.cfg.layers.global && typeof ctx.cfg.layers.global.seaLevel === 'number')
    ? ctx.cfg.layers.global.seaLevel
    : 0.2;
  const h = clamp01(base * 0.6);
  const oceanDepth = Math.max(0, seaLevel - h);
  const depthBand = h <= seaLevel ? (h < seaLevel - 0.12 ? 'deep' : 'shallow') : 'land';
  return {
    elevation: { raw: h, normalized: h },
    bathymetry: { depthBand, seaLevel, oceanDepth },
    slope: 0,
    plate: { id: hashString(ctx.seed || 'seed', coord.x, coord.y) & 0x7fffffff, edgeDistance: 1 },
    macroElevation: h,
    ridgeStrength: 0,
    oceanDepth,
    macro: {
      maskPostWarp: h,
      plate: { id: hashString(ctx.seed || 'seed', coord.x, coord.y) & 0x7fffffff, edgeDistanceNormalized: 1 },
      ridge: { strength: 0, contribution: 0 },
      detail: { contribution: 0, coastWeight: 0, edgeWeight: 0 },
      rawElevation: h,
      normalizedElevation: h,
      oceanDepth,
      seaLevel,
    }
  };
}

export { computeTilePart, fallback };
