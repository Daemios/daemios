// shared/lib/worldgen/derived.js
// Compute shared derived fields (relief index, climate scalars, cached geography)
// between Layer 2 and Layer 3. This module keeps the derived values centralized
// so that each layer can reuse them without introducing circular dependencies
// or excessive noise lookups.

function clamp01(v) {
  if (Number.isNaN(v)) return 0;
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

function ensureShared(ctx) {
  if (!ctx.shared) ctx.shared = { caches: {}, fields: {} };
  if (!ctx.shared.fields) ctx.shared.fields = {};
  return ctx.shared;
}

function computeReliefIndex(ctx) {
  const shared = ensureShared(ctx);
  const fields = shared.fields;
  const cfg = (ctx && ctx.cfg && ctx.cfg.layers && ctx.cfg.layers.layer2 && ctx.cfg.layers.layer2.reliefIndex)
    ? ctx.cfg.layers.layer2.reliefIndex
    : {};

  const plateEdge = clamp01(fields.plateEdgeDistance != null ? fields.plateEdgeDistance : 0.5);
  const mediumDetail = clamp01(fields.mediumDetailAbs != null ? fields.mediumDetailAbs : 0);
  const macroSlope = clamp01(fields.macroSlope != null ? fields.macroSlope : 0);
  const ridge = clamp01(fields.ridgeStrength != null ? fields.ridgeStrength : 0);

  const wPlate = typeof cfg.plateWeight === 'number' ? cfg.plateWeight : 0.42;
  const wDetail = typeof cfg.detailWeight === 'number' ? cfg.detailWeight : 0.28;
  const wSlope = typeof cfg.slopeWeight === 'number' ? cfg.slopeWeight : 0.2;
  const wRidge = typeof cfg.ridgeWeight === 'number' ? cfg.ridgeWeight : 0.1;
  const exponent = typeof cfg.exponent === 'number' ? Math.max(0.25, cfg.exponent) : 1.15;
  const baseBias = typeof cfg.bias === 'number' ? cfg.bias : 0;

  const region = shared.region || {};
  const regionMul = typeof region.reliefWeight === 'number' ? region.reliefWeight : 1;
  const regionBias = typeof region.reliefBias === 'number' ? region.reliefBias : 0;

  let relief = 0;
  relief += (1 - clamp01(plateEdge)) * wPlate;
  relief += mediumDetail * wDetail;
  relief += macroSlope * wSlope;
  relief += ridge * wRidge;
  relief = relief * regionMul + regionBias + baseBias;
  relief = clamp01(relief);
  relief = Math.pow(relief, exponent);

  shared.reliefIndex = clamp01(relief);
  return shared.reliefIndex;
}

function computeClimate(ctx) {
  const shared = ensureShared(ctx);
  const fields = shared.fields;
  const globalCfg = (ctx && ctx.cfg && ctx.cfg.layers && ctx.cfg.layers.global) ? ctx.cfg.layers.global : {};
  const climateCfg = (ctx && ctx.cfg && ctx.cfg.layers && ctx.cfg.layers.climate) ? ctx.cfg.layers.climate : {};

  const seaLevel = typeof globalCfg.seaLevel === 'number' ? globalCfg.seaLevel : 0.32;
  const macroElevation = clamp01(fields.macroElevation != null ? fields.macroElevation : 0.5);
  const latitude = clamp01(fields.latitudeNormalized != null ? fields.latitudeNormalized : 0.5);
  const reliefIndex = typeof shared.reliefIndex === 'number' ? shared.reliefIndex : computeReliefIndex(ctx);

  const coastWidth = typeof climateCfg.coastWidth === 'number' ? Math.max(1e-5, climateCfg.coastWidth) : 0.18;
  const lapseRate = typeof climateCfg.lapseRate === 'number' ? climateCfg.lapseRate : 0.55;
  const oceanTempMix = typeof climateCfg.oceanTemperatureMix === 'number' ? climateCfg.oceanTemperatureMix : 0.35;
  const rainShadowStrength = typeof climateCfg.rainShadowStrength === 'number' ? climateCfg.rainShadowStrength : 0.35;
  const altitudeDryness = typeof climateCfg.altitudeDryness === 'number' ? climateCfg.altitudeDryness : 0.22;

  const region = shared.region || {};
  const regionTempBias = typeof region.temperatureBias === 'number' ? region.temperatureBias : 0;
  const regionMoistureBias = typeof region.moistureBias === 'number' ? region.moistureBias : 0;

  // Latitude -> base temperature: 1 near equator (0.5), 0 near poles (0 or 1)
  let temperature = 1 - Math.abs(latitude - 0.5) * 2;
  temperature = clamp01(temperature);

  // Elevation lapse rate: reduce temperature at higher elevations (above sea level)
  const elevationAboveSea = Math.max(0, macroElevation - seaLevel);
  temperature -= elevationAboveSea * lapseRate;

  // Ocean proximity moderates temperature extremes
  const coastDelta = Math.abs(macroElevation - seaLevel);
  const oceanProximity = clamp01(1 - coastDelta / coastWidth);
  temperature = temperature * (1 - oceanTempMix) + oceanProximity * oceanTempMix;

  temperature += regionTempBias;
  temperature = clamp01(temperature);

  // Moisture base: proportional to ocean proximity
  let moisture = oceanProximity;
  moisture -= reliefIndex * rainShadowStrength * (1 - oceanProximity);
  moisture -= elevationAboveSea * altitudeDryness;
  moisture += regionMoistureBias;
  moisture = clamp01(moisture);

  shared.climate = {
    temperature,
    moisture,
    oceanProximity,
    latitude,
  };

  return shared.climate;
}

function computeDerivedFields(ctx) {
  const shared = ensureShared(ctx);
  computeReliefIndex(ctx);
  computeClimate(ctx);
  return shared;
}

export { computeDerivedFields };
