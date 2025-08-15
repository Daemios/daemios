import * as THREE from "three";
import createRealisticWaterMaterial from "@/3d/renderer/materials/RealisticWaterMaterial";
import { BIOME_THRESHOLDS } from "@/3d/terrain/biomes";

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
    modelScaleFactor,
    heightMagnitude,
    elevation,
  } = ctx;

  const radius = neighborRadius != null ? neighborRadius : 1;
  const hexW_est = layoutRadius * 1.5 * spacingFactor;
  const hexH_est = Math.sqrt(3) * layoutRadius * spacingFactor;
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
  const S = Math.min(2048, Math.ceil(Math.max(maxQAbs, maxRAbs)) + pad);
  const N = 2 * S + 1;

  const nbBaseCol = (centerChunk.x - radius) * chunkCols;
  const nbBaseRow = (centerChunk.y - radius) * chunkRows;
  const qOrigin = nbBaseCol;
  const rOrigin = nbBaseRow - Math.floor(qOrigin / 2);

  const data = new Uint8Array(N * N * 4);
  const seabed = new Uint8Array(N * N * 4);
  let idx = 0;
  for (let r = -S; r <= S; r += 1) {
    for (let q = -S; q <= S; q += 1) {
      const qW = q + qOrigin;
      const rW = r + rOrigin;
      const cell = world.getCell(qW, rW);
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
      idx += 4;
    }
  }

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
  const dt = (src) => {
    // operate on a local copy to avoid mutating the caller's array (ESLint no-param-reassign)
    const dist = new Float32Array(src);
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const idx2 = y * N + x;
        let best = dist[idx2];
        if (x > 0) best = Math.min(best, dist[idx2 - 1] + cellSize);
        if (y > 0) best = Math.min(best, dist[idx2 - N] + cellSize);
        if (x > 0 && y > 0) best = Math.min(best, dist[idx2 - N - 1] + diag);
        if (x < N - 1 && y > 0)
          best = Math.min(best, dist[idx2 - N + 1] + diag);
        dist[idx2] = best;
      }
    }
    for (let y = N - 1; y >= 0; y--) {
      for (let x = N - 1; x >= 0; x--) {
        const idx2 = y * N + x;
        let best = dist[idx2];
        if (x < N - 1) best = Math.min(best, dist[idx2 + 1] + cellSize);
        if (y < N - 1) best = Math.min(best, dist[idx2 + N] + cellSize);
        if (x < N - 1 && y < N - 1)
          best = Math.min(best, dist[idx2 + N + 1] + diag);
        if (x > 0 && y < N - 1)
          best = Math.min(best, dist[idx2 + N - 1] + diag);
        dist[idx2] = best;
      }
    }
    return dist;
  };
  const dtLand = dt(toLand);
  const dtWater = dt(toWater);
  const sdfArr = new Float32Array(len);
  for (let p = 0, j = 0; p < len; p++, j += 4) {
    const isLand = data[j] > 0;
    sdfArr[p] = isLand ? dtWater[p] : -dtLand[p];
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

  let minTop = Infinity;
  let minTopWater = Infinity;
  let waterCount = 0;
  const modelScaleY = (q, r) => {
    const c = world.getCell(q, r);
    return modelScaleFactor * (c ? c.yScale : 1);
  };
  world.forEach((q, r) => {
    const cell = world.getCell(q, r);
    const topY = hexMaxY * modelScaleY(q, r);
    if (topY < minTop) minTop = topY;
    const isWater =
      cell && (cell.biome === "deepWater" || cell.biome === "shallowWater");
    if (isWater) {
      if (topY < minTopWater) minTopWater = topY;
      waterCount += 1;
    }
  });
  if (!isFinite(minTop)) minTop = hexMaxY * modelScaleFactor;
  if (waterCount > 0 && isFinite(minTopWater)) minTop = minTopWater;

  const totalCols = (2 * radius + 1) * chunkCols;
  const totalRows = (2 * radius + 1) * chunkRows;
  const planeW = totalCols * hexW_est;
  const planeH = totalRows * hexH_est;
  const geom = new THREE.PlaneGeometry(planeW, planeH, 1, 1);
  geom.rotateX(-Math.PI / 2);

  const seaH = BIOME_THRESHOLDS.shallowWater;
  const base = elevation && elevation.base != null ? elevation.base : 0.08;
  const maxH = elevation && elevation.max != null ? elevation.max : 1.2;
  const seaLevelYScale = base + seaH * maxH;
  const hexMaxYScaled =
    hexMaxY *
    modelScaleFactor *
    (heightMagnitude != null ? heightMagnitude : 1.0);
  const seaLevelY = hexMaxYScaled * seaLevelYScale;

  const centerQ0 = qOrigin;
  const centerR0 = rOrigin;
  const mat = createRealisticWaterMaterial({
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
    seaLevelY,
    depthMax: hexMaxYScaled * 0.3,
    nearAlpha: 0.08,
    farAlpha: 0.9,
  });

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
  const waterY = seaLevelY + 0.001;
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
