import * as THREE from "three";
import createRealisticWaterMaterial from "@/3d2/renderer/materials/RealisticWaterMaterial";
import createGhibliWaterMaterial from "@/3d2/renderer/materials/GhibliWaterMaterial";
import { axialToXZ, getHexSize } from "@/3d2/config/layout";
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
  
  // IMPORTANT: match renderer's axialToXZ mapping by using the centralized hex size
  const __hexSize = getHexSize({ layoutRadius, spacingFactor });
  const hexW_est = __hexSize * 1.5;
  const hexH_est = __hexSize * Math.sqrt(3);

  // Compute exact axial bounds for the chunk neighborhood
  const nbBaseCol = (centerChunk.x - radius) * chunkCols; // qMin
  const nbBaseRow = (centerChunk.y - radius) * chunkRows; // rowMin (offset coords)
  const qMin = nbBaseCol;
  const qMax = (centerChunk.x + radius) * chunkCols + (chunkCols - 1);
  // For flat-top even-q offset -> axial, r ranges depend on q via floor(q/2)
  const rMin = nbBaseRow - Math.floor(qMax / 2);
  const rMax = (centerChunk.y + radius) * chunkRows + (chunkRows - 1) - Math.floor(qMin / 2);
  const qCenter = Math.floor((qMin + qMax) / 2);
  const rCenter = Math.floor((rMin + rMax) / 2);
  const dQ = Math.max(qMax - qCenter, qCenter - qMin);
  const dR = Math.max(rMax - rCenter, rCenter - rMin);
  // Tight S based on true axial extents (no extra pad to avoid texture shrink)
  const defaultMaxGridS = 2048;
  const maxGridS = typeof ctx.maxGridS === 'number' ? ctx.maxGridS : defaultMaxGridS;
  const S_uncapped = Math.max(dQ, dR);
  const S = Math.min(maxGridS, S_uncapped);
  const N = 2 * S + 1;

  // Use axial center as grid origin so [-S..S] covers [qMin..qMax] and [rMin..rMax]
  const qOrigin = qCenter;
  const rOrigin = rCenter;
  // Compute per-axis padding inside the square texture domain
  const fullQMin = qOrigin - S;
  const fullQMax = qOrigin + S;
  const fullRMin = rOrigin - S;
  const fullRMax = rOrigin + S;
  const padQMin = Math.max(0, qMin - fullQMin);
  const padQMax = Math.max(0, fullQMax - qMax);
  const padRMin = Math.max(0, rMin - fullRMin);
  const padRMax = Math.max(0, fullRMax - rMax);

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
      `[waterBuilder] gridParams: gridN=${N} S=${S} q0=${qOrigin} r0=${rOrigin} qMin=${qMin} qMax=${qMax} rMin=${rMin} rMax=${rMax} dQ=${dQ} dR=${dR} padQL=${padQMin} padQR=${padQMax} padRL=${padRMin} padRR=${padRMax} hexW=${hexW_est.toFixed(4)} hexH=${hexH_est.toFixed(4)}`
    );
  } catch (e) {
    // swallow diagnostics errors to avoid breaking production flow
    // eslint-disable-next-line no-console
    console.warn('[waterBuilder] debug logging failed', e && e.message ? e.message : e);
  }
  // Crop square textures to the exact rectangular neighborhood to avoid any pad-induced scaling
  const gridQMin = fullQMin + padQMin;
  const gridQMax = fullQMax - padQMax;
  const gridRMin = fullRMin + padRMin;
  const gridRMax = fullRMax - padRMax;
  const gridW = Math.max(1, gridQMax - gridQMin + 1);
  const gridH = Math.max(1, gridRMax - gridRMin + 1);

  let gridOriginXZ = { x: 0, z: 0 };
  let gridInvRow0 = { x: 0, z: 0 };
  let gridInvRow1 = { x: 0, z: 0 };
  let gridUseMatrix = false;
  try {
    const origin = axialToXZ(gridQMin, gridRMin, { layoutRadius, spacingFactor });
    const qStep = axialToXZ(gridQMin + 1, gridRMin, { layoutRadius, spacingFactor });
    const rStep = axialToXZ(gridQMin, gridRMin + 1, { layoutRadius, spacingFactor });
    const axisQ = { x: qStep.x - origin.x, z: qStep.z - origin.z };
    const axisR = { x: rStep.x - origin.x, z: rStep.z - origin.z };
    const det = axisQ.x * axisR.z - axisQ.z * axisR.x;
    if (isFinite(det) && Math.abs(det) > 1e-8) {
      const invDet = 1 / det;
      gridOriginXZ = origin;
      gridInvRow0 = { x: axisR.z * invDet, z: -axisR.x * invDet };
      gridInvRow1 = { x: -axisQ.z * invDet, z: axisQ.x * invDet };
      gridUseMatrix = true;
    }
  } catch (e) { /* ignore transform errors */ }
  // Crop signed distance (Float32, R)
  const sdfRect = new Float32Array(gridW * gridH);
  for (let ry = 0; ry < gridH; ry++) {
    const srcY = padRMin + ry;
    const srcBase = srcY * N;
    const dstBase = ry * gridW;
    for (let rx = 0; rx < gridW; rx++) {
      const srcX = padQMin + rx;
      sdfRect[dstBase + rx] = sdfArr[srcBase + srcX];
    }
  }
  const distTex = new THREE.DataTexture(
    sdfRect,
    gridW,
    gridH,
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

  // Crop seabed (Uint8 RGBA)
  const seabedRect = new Uint8Array(gridW * gridH * 4);
  for (let ry = 0; ry < gridH; ry++) {
    const srcY = padRMin + ry;
    const dstBase = ry * gridW * 4;
    for (let rx = 0; rx < gridW; rx++) {
      const srcX = padQMin + rx;
      const srcIdx4 = (srcY * N + srcX) * 4;
      const di = dstBase + rx * 4;
      seabedRect[di] = seabed[srcIdx4];
      seabedRect[di + 1] = seabed[srcIdx4 + 1];
      seabedRect[di + 2] = seabed[srcIdx4 + 2];
      seabedRect[di + 3] = seabed[srcIdx4 + 3];
    }
  }
  const seabedTex = new THREE.DataTexture(seabedRect, gridW, gridH, THREE.RGBAFormat);
  seabedTex.needsUpdate = true;
  seabedTex.magFilter = THREE.LinearFilter;
  seabedTex.minFilter = THREE.LinearFilter;
  seabedTex.wrapS = THREE.ClampToEdgeWrapping;
  seabedTex.wrapT = THREE.ClampToEdgeWrapping;

  // Ensure fallback values if no cells were present during the fill pass
  if (!isFinite(minTop)) minTop = hexMaxY;
  if (waterCount > 0 && isFinite(minTopWater)) minTop = minTopWater;

  // Compute world-space bbox of the exact neighborhood the tiles occupy to size the plane precisely
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  try {
    if (world && typeof world.forEach === 'function') {
      world.forEach((q, r) => {
        const x = hexW_est * q;
        const z = hexH_est * (r + q * 0.5);
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (z < minZ) minZ = z;
        if (z > maxZ) maxZ = z;
      });
    }
  } catch (e) { /* ignore */ }
  // Fallback if bbox couldn't be computed
  if (!isFinite(minX) || !isFinite(maxX) || !isFinite(minZ) || !isFinite(maxZ)) {
    const totalCols = (2 * radius + 1) * chunkCols;
    const totalRows = (2 * radius + 1) * chunkRows;
    minX = 0; maxX = totalCols * hexW_est;
    minZ = 0; maxZ = totalRows * hexH_est;
  }
  const planeW = Math.max(1e-4, Math.abs(maxX - minX) + hexW_est * 0.001);
  const planeH = Math.max(1e-4, Math.abs(maxZ - minZ) + hexH_est * 0.001);
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
      gridW,
      gridH,
      gridQMin,
      gridRMin,
      gridOrigin: gridOriginXZ,
      gridInvRow0,
      gridInvRow1,
      gridUseMatrix,
      gridHasPad: false,
      seaLevelY: seaLevelY_final,
      hexMaxYScaled,
      debugGrid: false,
    });
  } else {
    mat = createRealisticWaterMaterial({
      opacity: 0.96,
      distanceTexture: distTex,
      coverageTexture: coverageTex,
      seabedTexture: seabedTex,
      hexW: hexW_est,
      hexH: hexH_est,
      gridW,
      gridH,
      gridQMin,
      gridRMin,
      gridOrigin: gridOriginXZ,
      gridInvRow0,
      gridInvRow1,
      gridUseMatrix,
      gridHasPad: false,
      shoreWidth: 0.12,
      hexMaxYScaled,
      seaLevelY: seaLevelY_final,
      depthMax: Math.max(0.1, hexMaxYScaled * 0.3),
      nearAlpha: 0.08,
      farAlpha: 0.9,
      debugGrid: false,
    });
  }

  const mesh = new THREE.Mesh(geom, mat);
  const baseCol = (centerChunk.x - radius) * chunkCols;
  const baseRow = (centerChunk.y - radius) * chunkRows;
  const tlAx = { q: baseCol, r: baseRow - Math.floor(baseCol / 2) };
  const brCol = (centerChunk.x + radius) * chunkCols + (chunkCols - 1);
  const brRow = (centerChunk.y + radius) * chunkRows + (chunkRows - 1);
  const brAx = { q: brCol, r: brRow - Math.floor(brCol / 2) };
  // Prefer placing plane at the bbox center for exact alignment
  const xTL = hexW_est * tlAx.q;
  const zTL = hexH_est * (tlAx.r + tlAx.q * 0.5);
  const xBR = hexW_est * brAx.q;
  const zBR = hexH_est * (brAx.r + brAx.q * 0.5);
  let centerX = 0.5 * (xTL + xBR);
  let centerZ = 0.5 * (zTL + zBR);
  if (isFinite(minX) && isFinite(maxX) && isFinite(minZ) && isFinite(maxZ)) {
    centerX = 0.5 * (minX + maxX);
    centerZ = 0.5 * (minZ + maxZ);
  }
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
    gridQMin,
    gridRMin,
  };

  const endTs =
    typeof performance !== "undefined" && performance.now
      ? performance.now()
      : Date.now();
  if (ctx.profilerEnabled && ctx.profiler && ctx.profiler.push)
    ctx.profiler.push("build.water", endTs - startTs);
  return result;
}
