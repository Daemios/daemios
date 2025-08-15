import * as THREE from "three";
import { markRaw } from "vue";
import createRealisticWaterMaterial from "@/3d/renderer/materials/RealisticWaterMaterial";
import { BIOME_THRESHOLDS } from "@/3d/terrain/biomes";

// Simple axial offset->axial converter (even-q offset used by the app)
function offsetToAxial(col, row) {
  const q = col;
  const r = row - Math.floor(col / 2);
  return { q, r };
}

// Distance transform that returns a new array (avoids mutating caller arrays)
function distanceTransform(orig, N, cellSize) {
  const diag = cellSize * Math.SQRT2;
  const out = new Float32Array(orig); // copy
  // forward pass
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const idx = y * N + x;
      let best = out[idx];
      if (x > 0) best = Math.min(best, out[idx - 1] + cellSize);
      if (y > 0) best = Math.min(best, out[idx - N] + cellSize);
      if (x > 0 && y > 0) best = Math.min(best, out[idx - N - 1] + diag);
      if (x < N - 1 && y > 0) best = Math.min(best, out[idx - N + 1] + diag);
      out[idx] = best;
    }
  }
  // backward pass
  for (let y = N - 1; y >= 0; y--) {
    for (let x = N - 1; x >= 0; x--) {
      const idx = y * N + x;
      let best = out[idx];
      if (x < N - 1) best = Math.min(best, out[idx + 1] + cellSize);
      if (y < N - 1) best = Math.min(best, out[idx + N] + cellSize);
      if (x < N - 1 && y < N - 1) best = Math.min(best, out[idx + N + 1] + diag);
      if (x > 0 && y < N - 1) best = Math.min(best, out[idx + N - 1] + diag);
      out[idx] = best;
    }
  }
  return out;
}

/**
 * Build water resources for a neighborhood.
 * ctx: {
 *   world, layoutRadius, spacingFactor, chunkCols, chunkRows,
 *   centerChunk, neighborRadius, contactScale, modelScaleFactor, hexMaxY,
 *   elevation, heightMagnitude, features, profilerEnabled, profiler
 * }
 * Returns: { waterMesh, waterMaterial, waterMaskTex, waterDistanceTex, waterCoverageTex, waterSeabedTex, waterTexSize, waterPlaneW, waterPlaneH, waterTileCount, buildTime }
 */
export function buildWater(ctx) {
  const t0 = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
  const radius = ctx.neighborRadius != null ? ctx.neighborRadius : 1;

  // Estimate tile/plane sizes
  const hexW_est = ctx.layoutRadius * 1.5 * ctx.spacingFactor;
  const hexH_est = Math.sqrt(3) * ctx.layoutRadius * ctx.spacingFactor;
  const totalCols_est = (2 * radius + 1) * ctx.chunkCols;
  const totalRows_est = (2 * radius + 1) * ctx.chunkRows;
  const marginCols_est = 0;
  const marginRows_est = 0;
  const planeW_est = (totalCols_est + marginCols_est) * hexW_est;
  const planeH_est = (totalRows_est + marginRows_est) * hexH_est;

  // Compute S and N for axial texture window
  const halfW = planeW_est * 0.5;
  const halfH = planeH_est * 0.5;
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
  const chunkQSpan = ctx.chunkCols;
  const chunkRSpan = ctx.chunkRows;
  const chunkMargin = Math.max(chunkQSpan, chunkRSpan);
  const pad = Math.max(chunkMargin + 8, Math.ceil(Math.max(maxQAbs, maxRAbs) * 0.35));
  const S = Math.min(2048, Math.ceil(Math.max(maxQAbs, maxRAbs)) + pad);
  const N = 2 * S + 1;
  const waterTexSize = N;

  const nbBaseCol = (ctx.centerChunk.x - radius) * ctx.chunkCols;
  const nbBaseRow = (ctx.centerChunk.y - radius) * ctx.chunkRows;
  const qOrigin = nbBaseCol;
  const rOrigin = nbBaseRow - Math.floor(qOrigin / 2);

  // Build mask & seabed arrays
  const data = new Uint8Array(N * N * 4);
  const seabed = new Uint8Array(N * N * 4);
  let i = 0;
  for (let r = -S; r <= S; r += 1) {
    for (let q = -S; q <= S; q += 1) {
      const qW = q + qOrigin;
      const rW = r + rOrigin;
      const cell = ctx.world.getCell(qW, rW);
      const isWater = cell && (cell.biome === "deepWater" || cell.biome === "shallowWater");
      const v = isWater ? 0 : 255;
      data[i] = v; // R
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = 255;
      const ys = cell ? Math.max(0, Math.min(1, cell.yScale)) : 0;
      seabed[i] = Math.floor(ys * 255);
      seabed[i + 1] = 0;
      seabed[i + 2] = 0;
      seabed[i + 3] = 255;
      i += 4;
    }
  }

  const tex = markRaw(new THREE.DataTexture(data, N, N, THREE.RGBAFormat));
  tex.needsUpdate = true;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  const waterMaskTex = tex;

  const cellSize = Math.min(hexW_est, hexH_est);
  const len = N * N;
  const toWater = new Float32Array(len);
  const toLand = new Float32Array(len);
  const INF = 1e9;
  for (let p = 0, j = 0; p < len; p++, j += 4) {
    const isLand = data[j] > 0;
    toLand[p] = isLand ? 0 : INF;
    toWater[p] = isLand ? INF : 0;
  }
  // Run distance transforms and produce signed field
  const dtLand = distanceTransform(toLand, N, cellSize);
  const dtWater = distanceTransform(toWater, N, cellSize);
  const sdfArr = new Float32Array(len);
  for (let p = 0, j = 0; p < len; p++, j += 4) {
    const isLand = data[j] > 0;
    sdfArr[p] = isLand ? dtWater[p] : -dtLand[p];
  }

  const distTex = markRaw(new THREE.DataTexture(sdfArr, N, N, THREE.RedFormat, THREE.FloatType));
  distTex.needsUpdate = true;
  distTex.magFilter = THREE.LinearFilter;
  distTex.minFilter = THREE.LinearFilter;
  distTex.wrapS = THREE.ClampToEdgeWrapping;
  distTex.wrapT = THREE.ClampToEdgeWrapping;
  const waterDistanceTex = distTex;

  const coverageTex = markRaw(new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1, THREE.RGBAFormat));
  coverageTex.needsUpdate = true;
  coverageTex.magFilter = THREE.NearestFilter;
  coverageTex.minFilter = THREE.NearestFilter;
  coverageTex.wrapS = THREE.ClampToEdgeWrapping;
  coverageTex.wrapT = THREE.ClampToEdgeWrapping;
  const waterCoverageTex = coverageTex;

  const seabedTex = markRaw(new THREE.DataTexture(seabed, N, N, THREE.RGBAFormat));
  seabedTex.needsUpdate = true;
  seabedTex.magFilter = THREE.LinearFilter;
  seabedTex.minFilter = THREE.LinearFilter;
  seabedTex.wrapS = THREE.ClampToEdgeWrapping;
  seabedTex.wrapT = THREE.ClampToEdgeWrapping;
  const waterSeabedTex = seabedTex;

  // Compute minima and water counts
  let minTop = Infinity;
  let minTopWater = Infinity;
  let waterCount = 0;
  const modelScaleY = (q, r) => {
    const c = ctx.world.getCell(q, r);
    return ctx.modelScaleFactor * (c ? c.yScale : 1);
  };
  if (typeof ctx.world.forEach === "function") {
    ctx.world.forEach((q, r) => {
      const cell = ctx.world.getCell(q, r);
      const topY = ctx.hexMaxY * modelScaleY(q, r);
      if (topY < minTop) minTop = topY;
      const isWater = cell && (cell.biome === "deepWater" || cell.biome === "shallowWater");
      if (isWater) {
        if (topY < minTopWater) minTopWater = topY;
        waterCount += 1;
      }
    });
  }
  if (!isFinite(minTop)) minTop = ctx.hexMaxY * ctx.modelScaleFactor;
  if (waterCount > 0 && isFinite(minTopWater)) minTop = minTopWater;
  const waterTileCount = waterCount;

  // Plane geometry
  const hexW = ctx.layoutRadius * 1.5 * ctx.spacingFactor;
  const hexH = Math.sqrt(3) * ctx.layoutRadius * ctx.spacingFactor;
  const totalCols = (2 * radius + 1) * ctx.chunkCols;
  const totalRows = (2 * radius + 1) * ctx.chunkRows;
  const marginCols = 0;
  const marginRows = 0;
  const planeW = (totalCols + marginCols) * hexW;
  const planeH = (totalRows + marginRows) * hexH;

  // Water material
  const seaH = BIOME_THRESHOLDS.shallowWater;
  const base = ctx.elevation && ctx.elevation.base != null ? ctx.elevation.base : 0.08;
  const maxH = ctx.elevation && ctx.elevation.max != null ? ctx.elevation.max : 1.2;
  const seaLevelYScale = base + seaH * maxH;
  const hexMaxYScaled = ctx.hexMaxY * ctx.modelScaleFactor * (ctx.heightMagnitude != null ? ctx.heightMagnitude : 1.0);
  const seaLevelY = hexMaxYScaled * seaLevelYScale;

  const factory = createRealisticWaterMaterial;
  const mat = markRaw(
    factory({
      opacity: 0.96,
      distanceTexture: waterDistanceTex,
      coverageTexture: waterCoverageTex,
      seabedTexture: waterSeabedTex,
      hexW,
      hexH,
      gridN: N,
      gridOffset: S,
      gridQ0: qOrigin,
      gridR0: rOrigin,
      shoreWidth: 0.12,
      hexMaxYScaled,
      seaLevelY,
      depthMax: hexMaxYScaled * 0.3,
      nearAlpha: 0.08,
      farAlpha: 0.9,
    })
  );
  const waterMaterial = mat;

  const geom = new THREE.PlaneGeometry(planeW, planeH, 1, 1);
  geom.rotateX(-Math.PI / 2);

  const mesh = markRaw(new THREE.Mesh(geom, mat));
  const waterY = seaLevelY + 0.001;
  const baseCol = (ctx.centerChunk.x - radius) * ctx.chunkCols;
  const baseRow = (ctx.centerChunk.y - radius) * ctx.chunkRows;
  const endCol = (ctx.centerChunk.x + radius) * ctx.chunkCols + (ctx.chunkCols - 1);
  const endRow = (ctx.centerChunk.y + radius) * ctx.chunkRows + (ctx.chunkRows - 1);
  const tlAx = offsetToAxial(baseCol, baseRow);
  const brAx = offsetToAxial(endCol, endRow);
  const xTL = hexW * tlAx.q;
  const zTL = hexH * (tlAx.r + tlAx.q * 0.5);
  const xBR = hexW * brAx.q;
  const zBR = hexH * (brAx.r + brAx.q * 0.5);
  const centerX = 0.5 * (xTL + xBR);
  const centerZ = 0.5 * (zTL + zBR);
  mesh.position.set(centerX, waterY, centerZ);
  mesh.renderOrder = 1;
  mesh.frustumCulled = false;
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  const buildTime = (typeof performance !== "undefined" && performance.now ? performance.now() : Date.now()) - t0;
  if (ctx.profilerEnabled && ctx.profiler && typeof ctx.profiler.push === "function") {
    try {
      ctx.profiler.push("build.water", buildTime);
    } catch (e) {
      void e;
    }
  }

  return {
    waterMesh: mesh,
    waterMaterial,
    waterMaskTex,
    waterDistanceTex,
    waterCoverageTex,
    waterSeabedTex,
    waterTexSize,
    waterPlaneW: planeW,
    waterPlaneH: planeH,
    waterTileCount,
    buildTime,
  };
}
