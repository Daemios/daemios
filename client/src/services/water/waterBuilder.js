import * as THREE from "three";
import createRealisticWaterMaterial from "@/3d2/renderer/materials/RealisticWaterMaterial";
import createGhibliWaterMaterial from "@/3d2/renderer/materials/GhibliWaterMaterial";
import { BASE_HEX_SIZE } from "@/3d2/config/layout";
import { DEFAULT_CONFIG } from '../../../../shared/lib/worldgen/config.js';
import { BIOME_THRESHOLDS } from "@/3d2/domain/world/biomes";

// Build water plane, mask and distance textures for a neighborhood.
// ctx: { world, layoutRadius, spacingFactor, chunkCols, chunkRows, centerChunk, neighborRadius, hexMaxY, modelScaleFactor, heightMagnitude, elevation, profilerEnabled, profiler }
export function buildWater(ctx) {
  const startTs =
    typeof performance !== "undefined" && performance.now
      ? performance.now()
      : Date.now();

  const {
    world,
    layoutRadius,
    spacingFactor,
    chunkCols,
    chunkRows,
    centerChunk,
    neighborRadius,
    hexMaxY,
    elevation,
  } = ctx;

  const radius = neighborRadius != null ? neighborRadius : 1;
  const baseSize = BASE_HEX_SIZE || 1;
  const hexW_est = baseSize * layoutRadius * spacingFactor * 1.5;
  const hexH_est = baseSize * layoutRadius * spacingFactor * Math.sqrt(3);
  const totalCols_est = (2 * radius + 1) * chunkCols;
  const totalRows_est = (2 * radius + 1) * chunkRows;

  const halfW = 0.5 * hexW_est * Math.max(1, totalCols_est - 1);
  const halfH = 0.5 * hexH_est * Math.max(1, totalRows_est - 1);
  const corners = [
    { x: -halfW, z: -halfH },
    { x: -halfW, z: halfH },
    { x: halfW, z: -halfH },
    { x: halfW, z: halfH },
  ];
  let maxQAbs = 0,
    maxRAbs = 0;
  for (const c of corners) {
    const q = c.x / Math.max(1e-6, hexW_est);
    const r = c.z / Math.max(1e-6, hexH_est) - q * 0.5;
    maxQAbs = Math.max(maxQAbs, Math.abs(q));
    maxRAbs = Math.max(maxRAbs, Math.abs(r));
  }
  const chunkMargin = Math.max(chunkCols, chunkRows);
  const pad = Math.max(
    chunkMargin + 8,
    Math.ceil(Math.max(maxQAbs, maxRAbs) * 0.35)
  );
  // Allow developer fast-mode to clamp the generated grid size for quicker iteration
  const defaultMaxGridS = 2048;
  const maxGridS = typeof ctx.maxGridS === 'number' ? ctx.maxGridS : defaultMaxGridS;
  const S_uncapped = Math.ceil(Math.max(maxQAbs, maxRAbs)) + pad;
  const S = Math.min(maxGridS, S_uncapped);
  const N = 2 * S + 1;

  const nbBaseCol = (centerChunk.x - radius) * chunkCols;
  const nbBaseRow = (centerChunk.y - radius) * chunkRows;
  const qOrigin = nbBaseCol;
  const rOrigin = nbBaseRow - Math.floor(qOrigin / 2);

  const data = new Uint8Array(N * N * 4);
  const seabed = new Uint8Array(N * N * 4);
  // perf helper
  const perfNow = () => (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  const tFillStart = perfNow();
  let idx = 0;
  let fillWaterCount = 0;
  let fillLandCount = 0;
  // track neighborhood stats during the fill pass to avoid a second generator sweep
  let minTop = Infinity;
  let minTopWater = Infinity;
  let waterCount = 0;
  // Attempt to use bulk sampling API when available on the world/generator to avoid
  // per-cell generator calls. Fall back to the old per-cell loop if not present or on error.
  let usedBulk = false;
  let _blkSample = null;
  try {
    if (world && typeof world.sampleBlock === 'function') {
      // sampleBlock: (qOrigin,rOrigin,S) => { isWaterBuf: Uint8Array, yScaleBuf: Float32Array, N }
      _blkSample = world.sampleBlock(qOrigin, rOrigin, S);
      if (_blkSample && _blkSample.isWaterBuf && _blkSample.yScaleBuf) {
        usedBulk = true;
        const isWaterBuf = _blkSample.isWaterBuf;
        const yScaleBuf = _blkSample.yScaleBuf;
        const nBuf = _blkSample.N || N;
        // iterate in raster order (r from -S..S, q from -S..S)
        for (let p = 0, bufIdx = 0; p < nBuf * nBuf; p++, bufIdx++) {
          const isWater = !!isWaterBuf[bufIdx];
          const v = isWater ? 0 : 255;
          data[idx] = v;
          data[idx + 1] = 0;
          data[idx + 2] = 0;
          data[idx + 3] = 255;
          const ys = Math.max(0, Math.min(1, yScaleBuf[bufIdx] || 0));
          seabed[idx] = Math.floor(ys * 255);
          seabed[idx + 1] = 0;
          seabed[idx + 2] = 0;
          seabed[idx + 3] = 255;
          if (isWater) {
            fillWaterCount += 1;
            waterCount += 1;
          } else {
            fillLandCount += 1;
          }
          // compute topY for minTop calculations when a cell exists
          const topY = hexMaxY * ys;
          if (topY < minTop) minTop = topY;
          if (isWater && topY < minTopWater) minTopWater = topY;
          idx += 4;
        }
      }
    }
  } catch (e) {
    // if bulk sampling fails for any reason fall back to per-cell sampling
    usedBulk = false;
    // eslint-disable-next-line no-console
    console.warn('[waterBuilder] bulk sampleBlock failed, falling back to per-cell sampling', e && e.message ? e.message : e);
  }
  // Diagnostic: report whether bulk path was used and a tiny sample of the returned buffers
  try {
    // eslint-disable-next-line no-console
    console.log(`[waterBuilder] debug: usedBulk=${usedBulk}`);
    if (usedBulk && _blkSample) {
      const first = Math.min(64, (_blkSample.N || N) * (_blkSample.N || N));
      const isSample = Array.prototype.slice.call(_blkSample.isWaterBuf.subarray(0, first));
      const ySample = Array.prototype.slice.call(_blkSample.yScaleBuf.subarray(0, first));
      // eslint-disable-next-line no-console
      console.log('[waterBuilder] sampleBlock first entries:', { first, isSample: isSample.slice(0, 32), ySample: ySample.slice(0, 8) });
    }
  } catch (e) { /* ignore diag errors */ }
  if (!usedBulk) {
    // micro-optimizations: cache locals
    const getCell = world.getCell ? world.getCell.bind(world) : (qW, rW) => world.getCell(qW, rW);
    const qOriginLocal = qOrigin;
    const rOriginLocal = rOrigin;
    for (let r = -S; r <= S; r += 1) {
      for (let q = -S; q <= S; q += 1) {
        const qW = q + qOriginLocal;
        const rW = r + rOriginLocal;
        const cell = getCell(qW, rW);
        const isWater =
          cell && (cell.biome === "deepWater" || cell.biome === "shallowWater");
        const v = isWater ? 0 : 255;
        data[idx] = v;
        data[idx + 1] = 0;
        data[idx + 2] = 0;
        data[idx + 3] = 255;
        const ys = cell ? Math.max(0, Math.min(1, cell.yScale)) : 0;
        seabed[idx] = Math.floor(ys * 255);
        seabed[idx + 1] = 0;
        seabed[idx + 2] = 0;
        seabed[idx + 3] = 255;
        if (isWater) {
          fillWaterCount += 1;
          waterCount += 1;
        } else {
          fillLandCount += 1;
        }
        // compute topY for minTop calculations when a cell exists
        if (cell) {
          const topY = hexMaxY * ys;
          if (topY < minTop) minTop = topY;
          if (isWater && topY < minTopWater) minTopWater = topY;
        }
        idx += 4;
      }
    }
  }
  const tFillEnd = perfNow();
  const fillMs = tFillEnd - tFillStart;

  const tex = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
  tex.needsUpdate = true;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;

  const cellSize = Math.min(hexW_est, hexH_est);
  const diag = cellSize * Math.SQRT2;
  const len = N * N;
  const toWater = new Float32Array(len);
  const toLand = new Float32Array(len);
  const INF = 1e9;
  for (let p = 0, j = 0; p < len; p++, j += 4) {
    const isLand = data[j] > 0;
    toLand[p] = isLand ? 0 : INF;
    toWater[p] = isLand ? INF : 0;
  }
  // Distance transform: operate in-place on provided Float32Array to avoid extra allocations
  const dt = (distIn) => {
    // alias parameter to local variable to satisfy no-param-reassign lint rule
    const dist = distIn;
    for (let y = 0; y < N; y++) {
      const base = y * N;
      for (let x = 0; x < N; x++) {
        const idx2 = base + x;
        let best = dist[idx2];
        if (x > 0) {
          const v = dist[idx2 - 1] + cellSize;
          if (v < best) best = v;
        }
        if (y > 0) {
          const v = dist[idx2 - N] + cellSize;
          if (v < best) best = v;
        }
        if (x > 0 && y > 0) {
          const v = dist[idx2 - N - 1] + diag;
          if (v < best) best = v;
        }
        if (x < N - 1 && y > 0) {
          const v = dist[idx2 - N + 1] + diag;
          if (v < best) best = v;
        }
        dist[idx2] = best;
      }
    }
    for (let y = N - 1; y >= 0; y--) {
      const base = y * N;
      for (let x = N - 1; x >= 0; x--) {
        const idx2 = base + x;
        let best = dist[idx2];
        if (x < N - 1) {
          const v = dist[idx2 + 1] + cellSize;
          if (v < best) best = v;
        }
        if (y < N - 1) {
          const v = dist[idx2 + N] + cellSize;
          if (v < best) best = v;
        }
        if (x < N - 1 && y < N - 1) {
          const v = dist[idx2 + N + 1] + diag;
          if (v < best) best = v;
        }
        if (x > 0 && y < N - 1) {
          const v = dist[idx2 + N - 1] + diag;
          if (v < best) best = v;
        }
        dist[idx2] = best;
      }
    }
    return dist;
  };

  // Run DT in-place on the two buffers
  const tDtStart = perfNow();
  dt(toLand);
  const tDtLandEnd = perfNow();
  dt(toWater);
  const tDtWaterEnd = perfNow();

  // Debug: small snapshot of DT outputs to catch unexpected all-zero/INF cases
  try {
    const sampleCount = Math.min(12, len);
    const landSample = Array.prototype.slice.call(toLand.subarray(0, sampleCount));
    const waterSample = Array.prototype.slice.call(toWater.subarray(0, sampleCount));
    // eslint-disable-next-line no-console
    console.log('[waterBuilder] DT samples:', { landSample: landSample.slice(0,8), waterSample: waterSample.slice(0,8) });
  } catch (e) { /* ignore */ }

  // Reuse toWater as the final signed-distance array to avoid an extra allocation
  const sdfArr = toWater;
  // Compute signed values (land -> -dtLand, water -> +dtWater) and gather min/max
  let minV = Infinity;
  let maxV = -Infinity;
  const tSignStart = perfNow();
  for (let p = 0, j = 0; p < len; p++, j += 4) {
  const isLand = data[j] > 0;
  // Contract: toLand[p] is distance from this cell to nearest land (0 on land),
  // toWater[p] is distance from this cell to nearest water (0 on water).
  // Signed SDF should be negative on land (distance to water) and positive on water (distance to land).
  const v = isLand ? -toWater[p] : toLand[p];
    sdfArr[p] = v;
    if (v < minV) minV = v;
    if (v > maxV) maxV = v;
  }
  const tSignEnd = perfNow();
  try {
    const sFirst = Math.min(12, len);
    // Small snapshot of signed-distance values
    const sSample = Array.prototype.slice.call(sdfArr.subarray(0, sFirst));
    // eslint-disable-next-line no-console
    console.log('[waterBuilder] signed-distance sample:', sSample.slice(0, 8));
  } catch (e) { /* ignore */ }
  try {
    const debugN = Math.min(12, len);
    const detail = [];
    for (let p = 0, j = 0; p < debugN; p++, j += 4) {
      const mask = [data[j], data[j+1], data[j+2], data[j+3]];
      const isLand = data[j] > 0;
      detail.push({ p, mask, isLand, toLand: toLand[p], toWater: toWater[p], sdf: sdfArr[p] });
    }
    // eslint-disable-next-line no-console
    console.log('[waterBuilder] detail sample:', detail);
  } catch (e) { /* ignore */ }
  const dtLandMs = tDtLandEnd - tDtStart;
  const dtWaterMs = tDtWaterEnd - tDtLandEnd;
  const signMs = tSignEnd - tSignStart;

  // Developer diagnostics: always log sizes and a few stats about the generated SDF
  try {
    const tNow =
      typeof performance !== 'undefined' && performance.now
        ? performance.now()
        : Date.now();
    const buildMs = tNow - startTs;
    let minV = Infinity;
    let maxV = -Infinity;
    for (let i = 0; i < sdfArr.length; i++) {
      const v = sdfArr[i];
      if (v < minV) minV = v;
      if (v > maxV) maxV = v;
    }
    // eslint-disable-next-line no-console
    console.log(
      `[waterBuilder] debug: S_uncapped=${S_uncapped} S=${S} N=${N} len=${len} buildMs=${buildMs.toFixed(2)}ms min=${minV.toFixed(4)} max=${maxV.toFixed(4)} fill=${fillMs.toFixed(2)}ms fillWater=${fillWaterCount} fillLand=${fillLandCount} dtLand=${dtLandMs.toFixed(2)}ms dtWater=${dtWaterMs.toFixed(2)}ms sign=${signMs.toFixed(2)}ms`
    );
    // Also log grid mapping parameters we pass to the material
    // eslint-disable-next-line no-console
    console.log(
      `[waterBuilder] gridParams: gridN=${N} gridOffset=${S} gridQ0=${qOrigin} gridR0=${rOrigin} hexW=${hexW_est.toFixed(4)} hexH=${hexH_est.toFixed(4)} hexMaxYScaled=${hexMaxYScaled.toFixed(4)}`
    );
  } catch (e) {
    // swallow diagnostics errors to avoid breaking production flow
    // eslint-disable-next-line no-console
    console.warn('[waterBuilder] debug logging failed', e && e.message ? e.message : e);
  }
  const distTex = new THREE.DataTexture(
    sdfArr,
    N,
    N,
    THREE.RedFormat,
    THREE.FloatType
  );
  distTex.needsUpdate = true;
  distTex.magFilter = THREE.LinearFilter;
  distTex.minFilter = THREE.LinearFilter;
  distTex.wrapS = THREE.ClampToEdgeWrapping;
  distTex.wrapT = THREE.ClampToEdgeWrapping;

  const coverageTex = new THREE.DataTexture(
    new Uint8Array([255, 255, 255, 255]),
    1,
    1,
    THREE.RGBAFormat
  );
  coverageTex.needsUpdate = true;
  coverageTex.magFilter = THREE.NearestFilter;
  coverageTex.minFilter = THREE.NearestFilter;
  coverageTex.wrapS = THREE.ClampToEdgeWrapping;
  coverageTex.wrapT = THREE.ClampToEdgeWrapping;

  const seabedTex = new THREE.DataTexture(seabed, N, N, THREE.RGBAFormat);
  seabedTex.needsUpdate = true;
  seabedTex.magFilter = THREE.LinearFilter;
  seabedTex.minFilter = THREE.LinearFilter;
  seabedTex.wrapS = THREE.ClampToEdgeWrapping;
  seabedTex.wrapT = THREE.ClampToEdgeWrapping;

  // Ensure fallback values if no cells were present during the fill pass
  if (!isFinite(minTop)) minTop = hexMaxY;
  if (waterCount > 0 && isFinite(minTopWater)) minTop = minTopWater;

  const totalCols = (2 * radius + 1) * chunkCols;
  const totalRows = (2 * radius + 1) * chunkRows;
  const planeW = totalCols * hexW_est;
  const planeH = totalRows * hexH_est;
  const geom = new THREE.PlaneGeometry(planeW, planeH, 1, 1);
  geom.rotateX(-Math.PI / 2);

  // sea level will be derived from generator elevation or DEFAULT_CONFIG fallback below
  // Compute world-space elevation magnitude from centralized config so
  // generator-normalized values map unambiguously to world units.
  const cfgMaxH = (DEFAULT_CONFIG && typeof DEFAULT_CONFIG.maxHeight === 'number') ? DEFAULT_CONFIG.maxHeight : 1000;
  const cfgScale = (DEFAULT_CONFIG && typeof DEFAULT_CONFIG.scale === 'number') ? DEFAULT_CONFIG.scale : 1.0;
  // hexMaxYScaled is the maximum elevation we expose to the water material
  // in world units (maxHeight * scale).
  const hexMaxYScaled = cfgMaxH * cfgScale;
  // Determine normalized sea level. Prefer explicit config global seaLevel when present
  // to ensure deterministic placement; otherwise fall back to generator elevation or 0.20.
  let seaLevelNormalized = 0.2;
  if (DEFAULT_CONFIG && DEFAULT_CONFIG.layers && typeof DEFAULT_CONFIG.layers.global?.seaLevel === 'number') {
    seaLevelNormalized = DEFAULT_CONFIG.layers.global.seaLevel;
  } else if (elevation && typeof elevation.base === 'number' && typeof elevation.max === 'number') {
    seaLevelNormalized = (elevation.base + BIOME_THRESHOLDS.shallowWater * elevation.max) || seaLevelNormalized;
  }
  const seaLevelY_final = seaLevelNormalized * cfgMaxH * cfgScale;

  const centerQ0 = qOrigin;
  const centerR0 = rOrigin;
  // Allow opting into alternative materials (e.g., 'ghibli') via ctx.materialType
  const materialType = ctx.materialType || 'realistic';
  let mat = null;
  if (materialType === 'ghibli') {
    mat = createGhibliWaterMaterial({
      preset: ctx.materialPreset || 'vivid',
      distanceTexture: distTex,
      coverageTexture: coverageTex,
      seabedTexture: seabedTex,
      hexW: hexW_est,
      hexH: hexH_est,
      gridN: N,
      gridOffset: S,
      gridQ0: centerQ0,
      gridR0: centerR0,
      seaLevelY: seaLevelY_final,
      hexMaxYScaled,
    });
  } else {
    mat = createRealisticWaterMaterial({
    opacity: 0.96,
    distanceTexture: distTex,
    coverageTexture: coverageTex,
    seabedTexture: seabedTex,
    hexW: hexW_est,
    hexH: hexH_est,
    gridN: N,
    gridOffset: S,
    gridQ0: centerQ0,
    gridR0: centerR0,
    shoreWidth: 0.12,
    hexMaxYScaled,
  seaLevelY: seaLevelY_final,
    depthMax: Math.max(0.1, hexMaxYScaled * 0.3),
    nearAlpha: 0.08,
    farAlpha: 0.9,
  });
  }

  const mesh = new THREE.Mesh(geom, mat);
  const baseCol = (centerChunk.x - radius) * chunkCols;
  const baseRow = (centerChunk.y - radius) * chunkRows;
  const tlAx = { q: baseCol, r: baseRow - Math.floor(baseCol / 2) };
  const brCol = (centerChunk.x + radius) * chunkCols + (chunkCols - 1);
  const brRow = (centerChunk.y + radius) * chunkRows + (chunkRows - 1);
  const brAx = { q: brCol, r: brRow - Math.floor(brCol / 2) };
  const xTL = hexW_est * tlAx.q;
  const zTL = hexH_est * (tlAx.r + tlAx.q * 0.5);
  const xBR = hexW_est * brAx.q;
  const zBR = hexH_est * (brAx.r + brAx.q * 0.5);
  const centerX = 0.5 * (xTL + xBR);
  const centerZ = 0.5 * (zTL + zBR);
  const waterY = seaLevelY_final + 0.001;
  mesh.position.set(centerX, waterY, centerZ);
  mesh.renderOrder = 1;
  mesh.frustumCulled = false;
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  const result = {
    mesh,
    material: mat,
    waterMaskTex: tex,
    waterDistanceTex: distTex,
    waterCoverageTex: coverageTex,
    waterSeabedTex: seabedTex,
    waterPlaneW: planeW,
    waterPlaneH: planeH,
    waterTexSize: N,
    waterTileCount: waterCount,
  };

  const endTs =
    typeof performance !== "undefined" && performance.now
      ? performance.now()
      : Date.now();
  if (ctx.profilerEnabled && ctx.profiler && ctx.profiler.push)
    ctx.profiler.push("build.water", endTs - startTs);
  return result;
}
