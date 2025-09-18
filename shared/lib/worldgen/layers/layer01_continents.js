import { ensureWorldCoord } from '../utils/worldCoord.js';
import { ensureTileCache } from '../utils/tileCache.js';
import { getNoiseRegistry } from '../noiseRegistry.js';

function clamp(v, min, max) {
  if (v <= min) return min;
  if (v >= max) return max;
  return v;
}

function seedStringToNumber(s) {
  let n = 0;
  for (let i = 0; i < s.length; i++) n = (n * 31 + s.charCodeAt(i)) >>> 0;
  return n || 1;
}

function pseudoRandom(ix, iy, seedNum) {
  const x = Math.sin((ix * 127.1 + iy * 311.7) + seedNum * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function makePlateId(ix, iz, seedNum) {
  const a = (ix * 73856093) ^ (iz * 19349663) ^ seedNum;
  return Math.abs(a >>> 0);
}

function ensureRegistry(ctx) {
  if (ctx && ctx.noiseRegistry) return ctx.noiseRegistry;
  const reg = getNoiseRegistry(ctx && ctx.seed);
  if (ctx) ctx.noiseRegistry = reg;
  return reg;
}

function computeWarps(ctx, coord, cfg, registry, tileCache) {
  const warpCfg = cfg.warp || {};
  const slowCfg = warpCfg.slow || {};
  const fastCfg = warpCfg.fast || {};
  const slow = tileCache.get('warp:slow', () => {
    const amp = typeof slowCfg.amplitude === 'number' ? slowCfg.amplitude : 0;
    if (!amp) return { x: 0, z: 0 };
    const freq = typeof slowCfg.frequency === 'number' ? slowCfg.frequency : 0.001;
    const simplex = registry.simplex('warpSlow');
    const wx = simplex.noise2D(coord.x * freq, coord.z * freq) * amp;
    const wz = simplex.noise2D((coord.x + 2000) * freq, (coord.z - 2000) * freq) * amp;
    const power = typeof slowCfg.power === 'number' ? slowCfg.power : 1;
    if (power !== 1 && power > 0) {
      const mag = Math.sqrt(wx * wx + wz * wz) / Math.max(1e-6, amp);
      const scale = Math.pow(clamp(mag, 0, 1), power - 1);
      return { x: wx * scale, z: wz * scale };
    }
    return { x: wx, z: wz };
  });
  const fast = tileCache.get('warp:fast', () => {
    const amp = typeof fastCfg.amplitude === 'number' ? fastCfg.amplitude : 0;
    if (!amp) return { x: 0, z: 0 };
    const freq = typeof fastCfg.frequency === 'number' ? fastCfg.frequency : 0.004;
    const simplex = registry.simplex('warpFast');
    let wx = simplex.noise2D(coord.x * freq, coord.z * freq) * amp;
    let wz = simplex.noise2D((coord.x - 4000) * freq, (coord.z + 4000) * freq) * amp;
    const power = typeof fastCfg.power === 'number' ? fastCfg.power : (typeof warpCfg.fastPower === 'number' ? warpCfg.fastPower : 1);
    if (power !== 1 && power > 0) {
      const mag = Math.sqrt(wx * wx + wz * wz) / Math.max(1e-6, amp);
      const scale = Math.pow(clamp(mag, 0, 1), power - 1);
      wx *= scale;
      wz *= scale;
    }
    return { x: wx, z: wz };
  });
  const combined = { x: slow.x + fast.x, z: slow.z + fast.z };
  tileCache.set('warp:combined', combined);
  return { slow, fast, combined };
}

function computeMask(coord, cfg, warps, registry) {
  const maskCfg = cfg.continentalMask || {};
  const sampler = registry.fbm('macro', {
    octaves: typeof maskCfg.octaves === 'number' ? maskCfg.octaves : 5,
    lacunarity: typeof maskCfg.lacunarity === 'number' ? maskCfg.lacunarity : 1.85,
    gain: typeof maskCfg.gain === 'number' ? maskCfg.gain : 0.45,
  });
  const freq = typeof maskCfg.frequency === 'number' ? maskCfg.frequency : 0.0025;
  const pre = sampler(coord.x * freq, coord.z * freq);
  const preNorm = clamp(0.5 + 0.5 * pre, 0, 1);
  const warpedX = coord.x + warps.combined.x;
  const warpedZ = coord.z + warps.combined.z;
  const post = sampler(warpedX * freq, warpedZ * freq);
  const postNorm = clamp(0.5 + 0.5 * post, 0, 1);
  const preWeight = clamp(typeof maskCfg.preWarpBlend === 'number' ? maskCfg.preWarpBlend : 0.25, 0, 1);
  const blend = clamp(preNorm * preWeight + postNorm * (1 - preWeight), 0, 1);
  const bias = typeof maskCfg.bias === 'number' ? maskCfg.bias : 0;
  const biased = clamp(blend + bias, 0, 1);
  const power = typeof maskCfg.power === 'number' ? maskCfg.power : 1.0;
  const shaped = clamp(Math.pow(biased, Math.max(0.1, power)), 0, 1);
  const signed = clamp(shaped * 2 - 1, -1, 1);
  return { pre: preNorm, post: postNorm, blend, biased, shaped, signed };
}

function computePlateField(coord, cfg, seedNum, tileCache) {
  return tileCache.get('plates:field', () => {
    const plateCfg = cfg.plates || {};
    const cellSize = Math.max(32, typeof plateCfg.cellSize === 'number' ? plateCfg.cellSize : 520);
    const jitter = clamp(typeof plateCfg.jitter === 'number' ? plateCfg.jitter : 0.75, 0, 0.95);
    const searchRadius = Math.max(1, typeof plateCfg.searchRadius === 'number' ? Math.floor(plateCfg.searchRadius) : 2);
    const gx = Math.floor(coord.x / cellSize);
    const gz = Math.floor(coord.z / cellSize);
    let best = null;
    let second = null;
    for (let oz = -searchRadius; oz <= searchRadius; oz++) {
      for (let ox = -searchRadius; ox <= searchRadius; ox++) {
        const ix = gx + ox;
        const iz = gz + oz;
        const j1 = pseudoRandom(ix, iz, seedNum);
        const j2 = pseudoRandom(ix + 1337, iz - 927, seedNum);
        const centerX = (ix + 0.5) * cellSize + (j1 - 0.5) * jitter * cellSize;
        const centerZ = (iz + 0.5) * cellSize + (j2 - 0.5) * jitter * cellSize;
        const dx = coord.x - centerX;
        const dz = coord.z - centerZ;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const record = { dist, centerX, centerZ, ix, iz };
        if (!best || dist < best.dist) {
          second = best;
          best = record;
        } else if (!second || dist < second.dist) {
          second = record;
        }
      }
    }
    if (!best) best = { dist: 0, centerX: coord.x, centerZ: coord.z, ix: gx, iz: gz };
    if (!second) second = best;
    const cellRadius = cellSize * 0.5;
    const toEdge = Math.max(0, (second.dist - best.dist) * 0.5);
    const relaxation = clamp(typeof plateCfg.relaxation === 'number' ? plateCfg.relaxation : 0.82, 0.1, 4);
    const edgeDistanceNormalized = clamp(toEdge / Math.max(1e-6, cellRadius * relaxation), 0, 1);
    const plateId = makePlateId(best.ix, best.iz, seedNum);
    const neighborId = makePlateId(second.ix, second.iz, seedNum);
    const nx = second.centerX - best.centerX;
    const nz = second.centerZ - best.centerZ;
    const nLen = Math.sqrt(nx * nx + nz * nz) || 1;
    const edgeNormal = { x: nx / nLen, z: nz / nLen };
    const midpoint = { x: (best.centerX + second.centerX) * 0.5, z: (best.centerZ + second.centerZ) * 0.5 };
    const ridgeSeed = (plateId ^ ((neighborId << 1) | (neighborId >>> 1))) >>> 0;
    return {
      id: plateId,
      neighborId,
      cellSize,
      center: { x: best.centerX, z: best.centerZ },
      secondCenter: { x: second.centerX, z: second.centerZ },
      distanceToCenter: best.dist,
      distanceToEdge: toEdge,
      edgeDistanceNormalized,
      edgeNormal,
      midpoint,
      ridgeSeed,
    };
  });
}

function computeRidgeField(cfg, registry, warpedCoord, plateField) {
  const plateCfg = cfg.plates || {};
  const ridgeWidth = Math.max(1e-3, typeof plateCfg.ridgeWidth === 'number' ? plateCfg.ridgeWidth : 0.22);
  const ridgePower = typeof plateCfg.ridgePower === 'number' ? plateCfg.ridgePower : 1.6;
  const base = clamp(1 - plateField.distanceToEdge / Math.max(1e-6, plateField.cellSize * ridgeWidth), 0, 1);
  const shaped = Math.pow(base, ridgePower);
  const ridgeNoiseFreq = typeof plateCfg.ridgeNoiseFrequency === 'number' ? plateCfg.ridgeNoiseFrequency : 0.0035;
  const ridgeNoiseAmp = typeof plateCfg.ridgeNoiseAmplitude === 'number' ? plateCfg.ridgeNoiseAmplitude : 0.65;
  const ridgeNoise = registry.fbm('plateRidge', { octaves: 2, lacunarity: 2.1, gain: 0.55 });
  const noiseVal = ridgeNoise(warpedCoord.x * ridgeNoiseFreq, warpedCoord.z * ridgeNoiseFreq);
  const strength = clamp(shaped * (1 + noiseVal * ridgeNoiseAmp), 0, 1);
  const trenchFreq = typeof plateCfg.trenchNoiseFrequency === 'number' ? plateCfg.trenchNoiseFrequency : 0.0026;
  const trenchBias = typeof plateCfg.trenchBias === 'number' ? plateCfg.trenchBias : 0;
  const trenchProb = clamp(typeof plateCfg.trenchProbability === 'number' ? plateCfg.trenchProbability : 0.3, 0, 1);
  const trenchThreshold = trenchProb * 2 - 1;
  const trenchNoise = registry.simplex('plateTrench');
  const trenchVal = trenchNoise.noise2D(plateField.midpoint.x * trenchFreq, plateField.midpoint.z * trenchFreq) + trenchBias;
  const isTrench = trenchVal < trenchThreshold;
  const ridgeHeight = isTrench
    ? (typeof plateCfg.trenchHeight === 'number' ? plateCfg.trenchHeight : 0.42)
    : (typeof plateCfg.ridgeHeight === 'number' ? plateCfg.ridgeHeight : 0.32);
  const contribution = strength * ridgeHeight * (isTrench ? -1 : 1);
  const oceanMultiplier = isTrench ? (typeof plateCfg.trenchMultiplier === 'number' ? plateCfg.trenchMultiplier : 1.8) : 1;
  return { strength, contribution, isTrench, oceanMultiplier, trenchVal };
}

function computeMediumDetail(cfg, registry, warpedCoord, plateField, maskValue, seaLevel) {
  const detailCfg = cfg.mediumDetail || {};
  const freq = typeof detailCfg.frequency === 'number' ? detailCfg.frequency : 0.014;
  const amp = typeof detailCfg.amplitude === 'number' ? detailCfg.amplitude : 0.18;
  const sampler = registry.fbm('mediumDetail', {
    octaves: typeof detailCfg.octaves === 'number' ? detailCfg.octaves : 3,
    lacunarity: typeof detailCfg.lacunarity === 'number' ? detailCfg.lacunarity : 1.9,
    gain: typeof detailCfg.gain === 'number' ? detailCfg.gain : 0.5,
  });
  const sample = sampler(warpedCoord.x * freq, warpedCoord.z * freq);
  const coastFalloff = Math.max(1e-4, typeof detailCfg.coastFalloff === 'number' ? detailCfg.coastFalloff : 0.28);
  const coastExp = typeof detailCfg.coastExponent === 'number' ? detailCfg.coastExponent : 1.25;
  const plateFalloff = Math.max(1e-4, typeof detailCfg.plateFalloff === 'number' ? detailCfg.plateFalloff : 0.45);
  const plateExp = typeof detailCfg.plateExponent === 'number' ? detailCfg.plateExponent : 0.65;
  const coastDistance = Math.abs(maskValue - seaLevel);
  const coastWeight = clamp(Math.pow(clamp(coastDistance / coastFalloff, 0, 1), coastExp), 0, 1);
  const plateWeight = clamp(Math.pow(clamp(plateField.edgeDistanceNormalized / plateFalloff, 0, 1), plateExp), 0, 1);
  const weight = clamp(coastWeight * plateWeight, 0, 1);
  const contribution = sample * amp * weight;
  return { sample, contribution, weight };
}

function combineElevation(mask, ridgeField, mediumDetail, cfg) {
  const combineCfg = cfg.combine || {};
  const maskWeight = typeof combineCfg.maskWeight === 'number' ? combineCfg.maskWeight : 1.0;
  const ridgeWeight = typeof combineCfg.ridgeWeight === 'number' ? combineCfg.ridgeWeight : 0.6;
  const detailWeight = typeof combineCfg.detailWeight === 'number' ? combineCfg.detailWeight : 0.35;
  const bias = typeof combineCfg.bias === 'number' ? combineCfg.bias : 0;
  let signed = mask.signed * maskWeight;
  signed += ridgeField.contribution * ridgeWeight;
  signed += mediumDetail.contribution * detailWeight;
  signed += bias;
  return signed;
}

function normalizeElevation(value, cfg) {
  const norm = cfg.normalization || {};
  const minN = typeof norm.min === 'number' ? norm.min : -1;
  const maxN = typeof norm.max === 'number' ? norm.max : 1;
  const clamped = clamp(value, minN, maxN);
  let normalized = clamp((clamped - minN) / Math.max(1e-6, maxN - minN), 0, 1);
  const exp = typeof norm.exponent === 'number' ? norm.exponent : 1;
  if (exp !== 1 && exp > 0) normalized = Math.pow(normalized, exp);
  return { clamped, normalized };
}

function computeSlope(ridgeField, mediumDetail, cfg) {
  const ridgeScale = (cfg.ridges && typeof cfg.ridges.slopeScale === 'number') ? cfg.ridges.slopeScale : 0.75;
  const mediumSlope = Math.abs(mediumDetail.contribution) * 2.2;
  const ridgeSlope = ridgeField.strength * ridgeScale;
  return clamp(ridgeSlope + mediumSlope, 0, 1);
}

function tieBreakWater(delta, coord, seedNum, threshold) {
  if (Math.abs(delta) > threshold) return delta < 0;
  const jitter = pseudoRandom(Math.floor(coord.x), Math.floor(coord.z), seedNum);
  return jitter < 0.5;
}

function computeTilePart(ctx) {
  const cfg = (ctx && ctx.cfg && ctx.cfg.layers && ctx.cfg.layers.layer1) ? ctx.cfg.layers.layer1 : {};
  const coord = ensureWorldCoord(ctx);
  const tileCache = ensureTileCache(ctx);
  const registry = ensureRegistry(ctx);
  const warps = computeWarps(ctx, coord, cfg, registry, tileCache);
  const mask = computeMask(coord, cfg, warps, registry);
  const seedNum = seedStringToNumber(String(ctx.seed || ''));
  const plateField = computePlateField(coord, cfg, seedNum, tileCache);
  const warpedCoord = { x: coord.x + warps.combined.x, z: coord.z + warps.combined.z };
  const ridgeField = computeRidgeField(cfg, registry, warpedCoord, plateField);
  const seaLevel = (ctx && ctx.cfg && ctx.cfg.layers && ctx.cfg.layers.global && typeof ctx.cfg.layers.global.seaLevel === 'number')
    ? ctx.cfg.layers.global.seaLevel
    : 0.22;
  const mediumDetail = computeMediumDetail(cfg, registry, warpedCoord, plateField, mask.shaped, seaLevel);
  const signedElevation = combineElevation(mask, ridgeField, mediumDetail, cfg);
  const normalized = normalizeElevation(signedElevation, cfg);
  const oceanCfg = cfg.ocean || {};
  const depthScale = typeof oceanCfg.depthScale === 'number' ? oceanCfg.depthScale : 1.5;
  const trenchScale = typeof oceanCfg.trenchScale === 'number' ? oceanCfg.trenchScale : 2.2;
  const tieThreshold = typeof oceanCfg.tieBreaker === 'number' ? Math.max(0, oceanCfg.tieBreaker) : 0;
  const delta = normalized.normalized - seaLevel;
  const isWater = tieBreakWater(delta, coord, seedNum, tieThreshold);
  const oceanDepth = isWater ? Math.max(0, seaLevel - normalized.normalized) * depthScale * (ridgeField.isTrench ? trenchScale : 1) : 0;
  const depthBand = isWater ? (normalized.normalized < seaLevel - 0.12 ? 'deep' : 'shallow') : 'land';
  const slope = computeSlope(ridgeField, mediumDetail, cfg);
  const edgeDistance = clamp(plateField.edgeDistanceNormalized, 0, 1);
  return {
    elevation: { raw: normalized.normalized, normalized: normalized.normalized },
    macroElevation: normalized.normalized,
    plateId: plateField.id,
    ridgeStrength: clamp(ridgeField.strength, 0, 1),
    oceanDepth,
    bathymetry: { depthBand, seaLevel },
    slope,
    plate: {
      id: plateField.id,
      edgeDistance,
      edgeNormal: plateField.edgeNormal,
      ridgeSeed: plateField.ridgeSeed,
    },
    plateEdgeDistance: edgeDistance,
    debug: {
      mask,
      warps,
      ridge: ridgeField,
      mediumDetail,
      signedElevation,
      clampedElevation: normalized.clamped,
    },
  };
}

function fallback(ctx) {
  const cfg = (ctx && ctx.cfg && ctx.cfg.layers && ctx.cfg.layers.layer1) ? ctx.cfg.layers.layer1 : {};
  const coord = ensureWorldCoord(ctx);
  const seedNum = seedStringToNumber(String(ctx.seed || ''));
  const plateSize = (cfg.plates && typeof cfg.plates.cellSize === 'number') ? cfg.plates.cellSize : 256;
  const v = Math.abs(Math.sin((coord.x * 12.9898 + coord.z * 78.233) % 1));
  const base = clamp(v, 0, 1);
  const seaLevel = (typeof cfg.seaLevel === 'number') ? cfg.seaLevel : 0.52;
  const shallowBandFallback = (cfg.continentalMask && typeof cfg.continentalMask.shallowBand === 'number') ? cfg.continentalMask.shallowBand : 0.26;
  const h = base * shallowBandFallback * 0.9;
  const depthBand = h <= seaLevel ? 'shallow' : 'land';
  const plateId = makePlateId(Math.floor(coord.x / Math.max(1, plateSize)), Math.floor(coord.z / Math.max(1, plateSize)), seedNum);
  const edgeDistance = clamp(Math.abs((coord.x + coord.z) % plateSize - (plateSize / 2)) / Math.max(1, plateSize), 0, 1);
  return {
    elevation: { raw: h, normalized: h },
    bathymetry: { depthBand, seaLevel },
    slope: 0.0,
    plate: { id: plateId, edgeDistance },
    plateId,
    ridgeStrength: 0,
    oceanDepth: Math.max(0, seaLevel - h),
  };
}

export { computeTilePart, fallback };
