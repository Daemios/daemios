/* eslint-disable no-param-reassign, no-empty, no-unused-vars */
import * as THREE from "three";
import { markRaw } from "vue";
import { attachRadialFade, attachRadialFadeDepth } from "./radialFade";

export default class ChunkNeighborhood {
  constructor(opts) {
    this.scene = opts.scene;
    this.topGeom = opts.topGeom;
    this.sideGeom = opts.sideGeom;
    this.layoutRadius = opts.layoutRadius;
    this.spacingFactor = opts.spacingFactor;
    this.modelScaleFactor = opts.modelScaleFactor;
    this.contactScale = opts.contactScale;
    this.sideInset = opts.sideInset ?? 0.996;
    this.chunkCols = opts.chunkCols;
    this.chunkRows = opts.chunkRows;
    this.neighborRadius = opts.neighborRadius ?? 1;
    this.features = opts.features || {};
    this.world = opts.world; // expects getCell(q,r)
    this.heightMagnitude =
      opts.heightMagnitude != null ? opts.heightMagnitude : 1.0;
    this.pastelColorForChunk =
      opts.pastelColorForChunk || ((wx, wy) => new THREE.Color(0xffffff));
    // Streaming build tuning (helps avoid long stalls on large neighborhoods)
    this.streamBudgetMs = opts.streamBudgetMs ?? 6; // max ms of work per tick
    this.streamMaxChunksPerTick = opts.streamMaxChunksPerTick ?? 0; // 0 = unlimited per tick
    this.rowsPerSlice = opts.rowsPerSlice ?? 4; // rows to process per slice

    this.countPerChunk = this.chunkCols * this.chunkRows;
    this.neighborOffsets = this.computeNeighborOffsets(this.neighborRadius);

    this.topIM = null;
    this.sideIM = null;
    this.trailTopIM = null;
    this.trailSideIM = null;
    this.indexToQR = [];
    this._fadeUniforms = null;
    this._fadeUniformsDepth = null;

    // Internal streaming build state
    this._buildQueue = null; // Array of {slotIndex, wx, wy, startIdx}
    this._buildCursor = 0;
    this._buildToken = 0; // increment to cancel in-flight builds
    this._rafId = null; // requestAnimationFrame handle
    this._idleId = null; // requestIdleCallback handle (if available)
    this._writtenUntil = 0; // progressive visible instance count
    this._targetCount = 0; // final expected instance count for current build
    // Queue timing
    this._queueStartTime = 0; // performance.now() at start
    this._queueTaskCount = 0; // number of chunk tasks in this queue
    this._queueDoneCount = 0; // tasks finished in current queue
    this._savedBudget = null;
    this._savedRowsPerSlice = null; // to restore post-boost
    this._onBuildComplete =
      typeof opts.onBuildComplete === "function" ? opts.onBuildComplete : null;
    this._onBuildStart =
      typeof opts.onBuildStart === "function" ? opts.onBuildStart : null;

    // Persistent slot assignment across moves: keeps overlapping world chunks in the same slot
    // so their instance ranges (startIdx) do not change and do not require rewriting.
    this._slotAssignments = []; // index: slotIndex -> { wx, wy } | null
    this._chunkToSlot = new Map(); // key "wx,wy" -> slotIndex
    this._slotProgress = []; // index: slotIndex -> boolean (true when fully built)
  }

  computeNeighborOffsets(radius) {
    const out = [];
    for (let dy = -radius; dy <= radius; dy += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        out.push({ dx, dy });
      }
    }
    out.sort((a, b) => a.dx * a.dx + a.dy * a.dy - (b.dx * b.dx + b.dy * b.dy));
    return out;
  }

  build() {
    const total = this.neighborOffsets.length * this.countPerChunk;
    const topMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.7,
      metalness: 0.0,
    });
    const sideMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.7,
      metalness: 0.0,
    });
    // attach radial fades
    const topRef = attachRadialFade(topMat, {
      bucketKey: "top",
      layoutRadius: this.layoutRadius,
      contactScale: this.contactScale,
    });
    const sideRef = attachRadialFade(sideMat, {
      bucketKey: "side",
      layoutRadius: this.layoutRadius,
      contactScale: this.contactScale,
    });
    topMat.defines = Object.assign({}, topMat.defines, { TOP_BUCKET: 1 });
    const topDepth = topMat.clone();
    topDepth.depthWrite = true;
    topDepth.colorWrite = false;
    const topDepthRef = attachRadialFadeDepth(topDepth, {
      bucketKey: "top",
      layoutRadius: this.layoutRadius,
      contactScale: this.contactScale,
    });
    const sideDepth = sideMat.clone();
    sideDepth.depthWrite = true;
    sideDepth.colorWrite = false;
    const sideDepthRef = attachRadialFadeDepth(sideDepth, {
      bucketKey: "side",
      layoutRadius: this.layoutRadius,
      contactScale: this.contactScale,
    });
    this._fadeUniforms = { top: topRef.top, side: sideRef.side };
    this._fadeUniformsDepth = { top: topDepthRef.top, side: sideDepthRef.side };

    this.topIM = markRaw(new THREE.InstancedMesh(this.topGeom, topMat, total));
    this.sideIM = markRaw(
      new THREE.InstancedMesh(this.sideGeom, sideMat, total)
    );
    // Enable shadow casting and receiving
    this.topIM.castShadow = true;
    this.topIM.receiveShadow = true;
    this.sideIM.castShadow = true;
    this.sideIM.receiveShadow = true;
    // Avoid incorrect whole-mesh frustum culling while instances span a wide area
    this.topIM.frustumCulled = false;
    this.sideIM.frustumCulled = false;
    this.topIM.customDepthMaterial = topDepth;
    this.topIM.customDistanceMaterial = topDepth;
    this.sideIM.customDepthMaterial = sideDepth;
    this.sideIM.customDistanceMaterial = sideDepth;
    this.topIM.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.sideIM.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    // Add compact per-instance attributes for fast shader-based transforms
    const iCenterTop = new THREE.InstancedBufferAttribute(
      new Float32Array(total * 2),
      2
    );
    const iScaleTop = new THREE.InstancedBufferAttribute(
      new Float32Array(total),
      1
    );
    const iCenterSide = new THREE.InstancedBufferAttribute(
      new Float32Array(total * 2),
      2
    );
    const iScaleSide = new THREE.InstancedBufferAttribute(
      new Float32Array(total),
      1
    );
    this.topIM.geometry.setAttribute("iCenter", iCenterTop);
    this.topIM.geometry.setAttribute("iScaleY", iScaleTop);
    this.sideIM.geometry.setAttribute("iCenter", iCenterSide);
    this.sideIM.geometry.setAttribute("iScaleY", iScaleSide);
    // Cache raw arrays
    this._ctrArrTop = iCenterTop.array;
    this._scyArrTop = iScaleTop.array;
    this._ctrArrSide = iCenterSide.array;
    this._scyArrSide = iScaleSide.array;
    // Initialize instanceMatrix to identity so built-in instancing math (raycast, etc.) stays stable
    const writeIdentityBlocks = (arr) => {
      for (let i = 0, off = 0; i < total; i += 1, off += 16) {
        arr[off + 0] = 1;
        arr[off + 1] = 0;
        arr[off + 2] = 0;
        arr[off + 3] = 0;
        arr[off + 4] = 0;
        arr[off + 5] = 1;
        arr[off + 6] = 0;
        arr[off + 7] = 0;
        arr[off + 8] = 0;
        arr[off + 9] = 0;
        arr[off + 10] = 1;
        arr[off + 11] = 0;
        arr[off + 12] = 0;
        arr[off + 13] = 0;
        arr[off + 14] = 0;
        arr[off + 15] = 1;
      }
    };
    if (this.topIM.instanceMatrix && this.topIM.instanceMatrix.array)
      writeIdentityBlocks(this.topIM.instanceMatrix.array);
    if (this.sideIM.instanceMatrix && this.sideIM.instanceMatrix.array)
      writeIdentityBlocks(this.sideIM.instanceMatrix.array);
    // pre-create instance colors
    const colorsTop = new Float32Array(total * 3);
    const colorsSide = new Float32Array(total * 3);
    this.topIM.instanceColor = new THREE.InstancedBufferAttribute(colorsTop, 3);
    this.sideIM.instanceColor = new THREE.InstancedBufferAttribute(
      colorsSide,
      3
    );

    this.indexToQR = new Array(total);
    this.scene.add(this.sideIM);
    this.scene.add(this.topIM);
    // Cache raw typed arrays for fast writes
    this._matArrTop =
      this.topIM.instanceMatrix && this.topIM.instanceMatrix.array
        ? this.topIM.instanceMatrix.array
        : null;
    this._matArrSide =
      this.sideIM.instanceMatrix && this.sideIM.instanceMatrix.array
        ? this.sideIM.instanceMatrix.array
        : null;
    this._colArrTop =
      this.topIM.instanceColor && this.topIM.instanceColor.array
        ? this.topIM.instanceColor.array
        : null;
    this._colArrSide =
      this.sideIM.instanceColor && this.sideIM.instanceColor.array
        ? this.sideIM.instanceColor.array
        : null;

    // trails: use cloned materials so later changes on live materials don't affect trail appearance
    const topMatTrail = topMat.clone();
    const sideMatTrail = sideMat.clone();
    // Re-attach radial fades for trail materials and mirror TOP_BUCKET define
    const topTrailRef = attachRadialFade(topMatTrail, {
      bucketKey: "top",
      layoutRadius: this.layoutRadius,
      contactScale: this.contactScale,
    });
    const sideTrailRef = attachRadialFade(sideMatTrail, {
      bucketKey: "side",
      layoutRadius: this.layoutRadius,
      contactScale: this.contactScale,
    });
    topMatTrail.defines = Object.assign({}, topMatTrail.defines, {
      TOP_BUCKET: 1,
    });
    const topDepthTrail = topDepth.clone();
    const sideDepthTrail = sideDepth.clone();
    const topDepthTrailRef = attachRadialFadeDepth(topDepthTrail, {
      bucketKey: "top",
      layoutRadius: this.layoutRadius,
      contactScale: this.contactScale,
    });
    const sideDepthTrailRef = attachRadialFadeDepth(sideDepthTrail, {
      bucketKey: "side",
      layoutRadius: this.layoutRadius,
      contactScale: this.contactScale,
    });
    this._fadeUniformsTrail = { top: topTrailRef.top, side: sideTrailRef.side };
    this._fadeUniformsDepthTrail = {
      top: topDepthTrailRef.top,
      side: sideDepthTrailRef.side,
    };

    this.trailTopIM = markRaw(
      new THREE.InstancedMesh(this.topGeom, topMatTrail, total)
    );
    this.trailSideIM = markRaw(
      new THREE.InstancedMesh(this.sideGeom, sideMatTrail, total)
    );
    // Enable shadow casting and receiving for trail meshes
    this.trailTopIM.castShadow = true;
    this.trailTopIM.receiveShadow = true;
    this.trailSideIM.castShadow = true;
    this.trailSideIM.receiveShadow = true;
    // Avoid incorrect culling of wide-span trails
    this.trailTopIM.frustumCulled = false;
    this.trailSideIM.frustumCulled = false;
    this.trailTopIM.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.trailSideIM.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    // Trail meshes mirror transforms via the same compact attributes
    if (this._ctrArrTop && this._scyArrTop) {
      this.trailTopIM.geometry.setAttribute(
        "iCenter",
        new THREE.InstancedBufferAttribute(this._ctrArrTop, 2)
      );
      this.trailTopIM.geometry.setAttribute(
        "iScaleY",
        new THREE.InstancedBufferAttribute(this._scyArrTop, 1)
      );
    }
    if (this._ctrArrSide && this._scyArrSide) {
      this.trailSideIM.geometry.setAttribute(
        "iCenter",
        new THREE.InstancedBufferAttribute(this._ctrArrSide, 2)
      );
      this.trailSideIM.geometry.setAttribute(
        "iScaleY",
        new THREE.InstancedBufferAttribute(this._scyArrSide, 1)
      );
    }
    this.trailTopIM.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(total * 3),
      3
    );
    this.trailSideIM.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(total * 3),
      3
    );
    this.trailTopIM.visible = false;
    this.trailSideIM.visible = false;
    this.trailTopIM.renderOrder = (this.topIM.renderOrder || 0) - 1;
    this.trailSideIM.renderOrder = (this.sideIM.renderOrder || 0) - 1;
    this.trailTopIM.customDepthMaterial = topDepthTrail;
    this.trailTopIM.customDistanceMaterial = topDepthTrail;
    this.trailSideIM.customDepthMaterial = sideDepthTrail;
    this.trailSideIM.customDistanceMaterial = sideDepthTrail;
    this.scene.add(this.trailSideIM);
    this.scene.add(this.trailTopIM);

    // Custom raycast that mirrors shader-based instance transforms for accurate picking
    const makeAttrRaycast = (im, ctrArrRef, scyArrRef) => {
      const helper = new THREE.Mesh(im.geometry, new THREE.MeshBasicMaterial());
      const tmpMat = new THREE.Matrix4();
      const tmpPos = new THREE.Vector3();
      const tmpQuat = new THREE.Quaternion();
      const tmpScale = new THREE.Vector3();
      const tmpHits = [];
      const raycastImpl = function raycast(raycaster, intersects) {
        // Fallback to default if not using attributes path
        if (
          !im.material ||
          !im.material.defines ||
          !im.material.defines.USE_ATTR_TRANSFORM
        ) {
          THREE.InstancedMesh.prototype.raycast.call(im, raycaster, intersects);
          return;
        }
        const ctrArr = ctrArrRef;
        const scyArr = scyArrRef;
        const count = Math.min(
          im.count | 0,
          im.instanceMatrix
            ? im.instanceMatrix.count
            : ctrArr
            ? ctrArr.length / 2
            : 0
        );
        const xzScale =
          im.material &&
          im.material.userData &&
          im.material.userData.uXZScale != null
            ? im.material.userData.uXZScale
            : 1.0;
        helper.geometry = im.geometry; // ensure up to date
        // Iterate visible instances; build world matrix as modelMatrix * Translate(iCenter) * Scale(uXZScale, iScaleY, uXZScale)
        for (let i = 0; i < count; i += 1) {
          const cx = ctrArr ? ctrArr[i * 2] : 0;
          const cz = ctrArr ? ctrArr[i * 2 + 1] : 0;
          const sy = scyArr ? scyArr[i] || 1.0 : 1.0;
          tmpPos.set(cx, 0, cz);
          tmpQuat.identity();
          tmpScale.set(xzScale, sy, xzScale);
          tmpMat.compose(tmpPos, tmpQuat, tmpScale);
          helper.matrixWorld.copy(im.matrixWorld).multiply(tmpMat);
          // Delegate to Mesh.raycast using the helper with our matrixWorld
          tmpHits.length = 0;
          THREE.Mesh.prototype.raycast.call(helper, raycaster, tmpHits);
          if (tmpHits.length > 0) {
            for (let k = 0; k < tmpHits.length; k += 1) {
              const hit = tmpHits[k];
              hit.object = im; // report parent InstancedMesh
              hit.instanceId = i;
              intersects.push(hit);
            }
          }
        }
      };
      return raycastImpl;
    };
    // Install on top and side meshes
    if (this.topIM && this._ctrArrTop && this._scyArrTop) {
      this.topIM.raycast = makeAttrRaycast(
        this.topIM,
        this._ctrArrTop,
        this._scyArrTop
      );
    }
    if (this.sideIM && this._ctrArrSide && this._scyArrSide) {
      this.sideIM.raycast = makeAttrRaycast(
        this.sideIM,
        this._ctrArrSide,
        this._scyArrSide
      );
    }

    // Initialize slot assignments array length
    this._slotAssignments = new Array(this.neighborOffsets.length).fill(null);
    this._slotProgress = new Array(this.neighborOffsets.length).fill(false);

    // Enable shader attr transforms and set uniform scales
    topMat.defines = Object.assign({}, topMat.defines, {
      USE_ATTR_TRANSFORM: 1,
    });
    sideMat.defines = Object.assign({}, sideMat.defines, {
      USE_ATTR_TRANSFORM: 1,
    });
    topMatTrail.defines = Object.assign({}, topMatTrail.defines, {
      USE_ATTR_TRANSFORM: 1,
    });
    sideMatTrail.defines = Object.assign({}, sideMatTrail.defines, {
      USE_ATTR_TRANSFORM: 1,
    });
    // Depth variants also need the define
    topDepth.defines = Object.assign({}, topDepth.defines, {
      USE_ATTR_TRANSFORM: 1,
    });
    sideDepth.defines = Object.assign({}, sideDepth.defines, {
      USE_ATTR_TRANSFORM: 1,
    });
    topDepthTrail.defines = Object.assign({}, topDepthTrail.defines, {
      USE_ATTR_TRANSFORM: 1,
    });
    sideDepthTrail.defines = Object.assign({}, sideDepthTrail.defines, {
      USE_ATTR_TRANSFORM: 1,
    });
    const sx = this.modelScaleFactor;
    const xzScale = sx * this.contactScale;
    const sideXZ = xzScale * (this.sideInset != null ? this.sideInset : 0.996);
    // Stash uniform defaults onto materials so onBeforeCompile can read initial scale
    topMat.userData = Object.assign({}, topMat.userData, { uXZScale: xzScale });
    sideMat.userData = Object.assign({}, sideMat.userData, {
      uXZScale: sideXZ,
    });
    topMatTrail.userData = Object.assign({}, topMatTrail.userData, {
      uXZScale: xzScale,
    });
    sideMatTrail.userData = Object.assign({}, sideMatTrail.userData, {
      uXZScale: sideXZ,
    });
    topDepth.userData = Object.assign({}, topDepth.userData, {
      uXZScale: xzScale,
    });
    sideDepth.userData = Object.assign({}, sideDepth.userData, {
      uXZScale: sideXZ,
    });
    topDepthTrail.userData = Object.assign({}, topDepthTrail.userData, {
      uXZScale: xzScale,
    });
    sideDepthTrail.userData = Object.assign({}, sideDepthTrail.userData, {
      uXZScale: sideXZ,
    });
    if (
      this._fadeUniforms &&
      this._fadeUniforms.top &&
      this._fadeUniforms.top.uXZScale
    )
      this._fadeUniforms.top.uXZScale.value = xzScale;
    if (
      this._fadeUniforms &&
      this._fadeUniforms.side &&
      this._fadeUniforms.side.uXZScale
    )
      this._fadeUniforms.side.uXZScale.value = sideXZ;
    if (
      this._fadeUniformsTrail &&
      this._fadeUniformsTrail.top &&
      this._fadeUniformsTrail.top.uXZScale
    )
      this._fadeUniformsTrail.top.uXZScale.value = xzScale;
    if (
      this._fadeUniformsTrail &&
      this._fadeUniformsTrail.side &&
      this._fadeUniformsTrail.side.uXZScale
    )
      this._fadeUniformsTrail.side.uXZScale.value = sideXZ;
    if (
      this._fadeUniformsDepth &&
      this._fadeUniformsDepth.top &&
      this._fadeUniformsDepth.top.uXZScale
    )
      this._fadeUniformsDepth.top.uXZScale.value = xzScale;
    if (
      this._fadeUniformsDepth &&
      this._fadeUniformsDepth.side &&
      this._fadeUniformsDepth.side.uXZScale
    )
      this._fadeUniformsDepth.side.uXZScale.value = sideXZ;
    if (
      this._fadeUniformsDepthTrail &&
      this._fadeUniformsDepthTrail.top &&
      this._fadeUniformsDepthTrail.top.uXZScale
    )
      this._fadeUniformsDepthTrail.top.uXZScale.value = xzScale;
    if (
      this._fadeUniformsDepthTrail &&
      this._fadeUniformsDepthTrail.side &&
      this._fadeUniformsDepthTrail.side.uXZScale
    )
      this._fadeUniformsDepthTrail.side.uXZScale.value = sideXZ;

    // Force recompile after define changes
    topMat.needsUpdate = true;
    sideMat.needsUpdate = true;
    topMatTrail.needsUpdate = true;
    sideMatTrail.needsUpdate = true;
    topDepth.needsUpdate = true;
    sideDepth.needsUpdate = true;
    topDepthTrail.needsUpdate = true;
    sideDepthTrail.needsUpdate = true;

    return {
      topIM: this.topIM,
      sideIM: this.sideIM,
      trailTopIM: this.trailTopIM,
      trailSideIM: this.trailSideIM,
      indexToQR: this.indexToQR,
      neighborOffsets: this.neighborOffsets,
      countPerChunk: this.countPerChunk,
      fadeUniforms: this._fadeUniforms,
      fadeUniformsDepth: this._fadeUniformsDepth,
      fadeUniformsTrail: this._fadeUniformsTrail,
      fadeUniformsDepthTrail: this._fadeUniformsDepthTrail,
    };
  }

  fillChunk(slotIndex, wx, wy, instBaseOverride) {
    if (!this.topIM || !this.sideIM) return;
    // profiler: start per-chunk timer (synchronous path)
    const __profChunkStart =
      typeof performance !== "undefined" && performance.now
        ? performance.now()
        : Date.now();
    // Sub-stage timers (sampled) for profiling
    let __dtCell = 0,
      __dtMatrix = 0,
      __dtColor = 0,
      __samples = 0;
    const __SAMPLE_EVERY = 32; // sample 1 out of 32 tiles to keep overhead low
    const layoutRadius = this.layoutRadius;
    const hexWidth = layoutRadius * 1.5 * this.spacingFactor;
    const hexHeight = Math.sqrt(3) * layoutRadius * this.spacingFactor;
    const sx = this.modelScaleFactor;
    const hMag = this.heightMagnitude != null ? this.heightMagnitude : 1.0;
    const xzScale = sx * this.contactScale;
    const sideXZ = xzScale * (this.sideInset != null ? this.sideInset : 0.996);
    const baseCol = wx * this.chunkCols;
    const baseRow = wy * this.chunkRows;
    const startIdx =
      typeof instBaseOverride === "number"
        ? instBaseOverride
        : slotIndex * this.countPerChunk;
    let local = 0;
    const useChunkColors = !!this.features.chunkColors;
    const cTop = this.pastelColorForChunk(wx, wy);
    const cSide = cTop.clone().multiplyScalar(0.8);
    // Preallocated math objects for fast instance matrix composition (no per-instance clones)
    // Attribute writers
    const writeCenter = (arr2, idx2, x, z) => {
      arr2[idx2] = x;
      arr2[idx2 + 1] = z;
    };
    for (let row = 0; row < this.chunkRows; row += 1) {
      for (let col = 0; col < this.chunkCols; col += 1) {
        const gCol = baseCol + col;
        const gRow = baseRow + row;
        const q = gCol; // even-q offset -> axial
        const r = gRow - Math.floor(gCol / 2);
        const x = hexWidth * q;
        const z = hexHeight * (r + q / 2);
        // Sampled timing: cell fetch
        let __t0;
        const __doSample = (local & (__SAMPLE_EVERY - 1)) === 0;
        if (__doSample) {
          __t0 =
            typeof performance !== "undefined" && performance.now
              ? performance.now()
              : Date.now();
        }
        const cell = this.world ? this.world.getCell(q, r) : null;
        if (__doSample) {
          __dtCell +=
            (typeof performance !== "undefined" && performance.now
              ? performance.now()
              : Date.now()) - __t0;
        }
        if (__doSample) {
          __t0 =
            typeof performance !== "undefined" && performance.now
              ? performance.now()
              : Date.now();
          __samples += 1;
        }
        const isWater = !!(
          cell &&
          (cell.biome === "deepWater" || cell.biome === "shallowWater")
        );
        // Top center/scale via attributes
        const instIdx = startIdx + local;
        if (this._ctrArrTop && this._scyArrTop) {
          writeCenter(this._ctrArrTop, instIdx * 2, x, z);
          this._scyArrTop[instIdx] = sx * (cell ? cell.yScale : 1.0) * hMag;
        }
        // Side via attributes
        const sideY = isWater
          ? Math.max(0.001, 0.02 * (this.modelScaleFactor || 1))
          : sx * (cell ? cell.yScale : 1.0) * hMag;
        if (this._ctrArrSide && this._scyArrSide) {
          writeCenter(this._ctrArrSide, instIdx * 2, x, z);
          this._scyArrSide[instIdx] = sideY;
        }
        if (__doSample) {
          __dtMatrix +=
            (typeof performance !== "undefined" && performance.now
              ? performance.now()
              : Date.now()) - __t0;
          __t0 =
            typeof performance !== "undefined" && performance.now
              ? performance.now()
              : Date.now();
        }
        if (useChunkColors) {
          if (this._colArrTop) {
            const o = instIdx * 3;
            this._colArrTop[o] = cTop.r;
            this._colArrTop[o + 1] = cTop.g;
            this._colArrTop[o + 2] = cTop.b;
          } else {
            this.topIM.setColorAt(instIdx, cTop);
          }
          if (this._colArrSide) {
            const o2 = instIdx * 3;
            this._colArrSide[o2] = cSide.r;
            this._colArrSide[o2 + 1] = cSide.g;
            this._colArrSide[o2 + 2] = cSide.b;
          } else {
            this.sideIM.setColorAt(instIdx, cSide);
          }
        } else {
          const topC = cell ? cell.colorTop : cTop;
          const sideC = cell ? cell.colorSide : cSide;
          if (this._colArrTop) {
            const o = instIdx * 3;
            this._colArrTop[o] = topC.r;
            this._colArrTop[o + 1] = topC.g;
            this._colArrTop[o + 2] = topC.b;
          } else {
            this.topIM.setColorAt(instIdx, topC);
          }
          if (this._colArrSide) {
            const o2 = instIdx * 3;
            this._colArrSide[o2] = sideC.r;
            this._colArrSide[o2 + 1] = sideC.g;
            this._colArrSide[o2 + 2] = sideC.b;
          } else {
            this.sideIM.setColorAt(instIdx, sideC);
          }
        }
        if (__doSample) {
          __dtColor +=
            (typeof performance !== "undefined" && performance.now
              ? performance.now()
              : Date.now()) - __t0;
        }
        this.indexToQR[instIdx] = { q, r, wx, wy, col: gCol, row: gRow };
        local += 1;
      }
    }
    // profiler: end per-chunk timer (synchronous path)
    const __profChunkEnd =
      typeof performance !== "undefined" && performance.now
        ? performance.now()
        : Date.now();
    const __profChunkDt = __profChunkEnd - __profChunkStart;
    if (typeof window !== "undefined" && window.__DAEMIOS_PROF) {
      try {
        window.__DAEMIOS_PROF("chunk.generate", __profChunkDt);
      } catch (e) {}
      // Scale sampled sub-timers to full chunk cost estimate
      if (__samples > 0) {
        const mult = (this.chunkCols * this.chunkRows) / __samples;
        try {
          window.__DAEMIOS_PROF("chunk.gen.cell", __dtCell * mult);
        } catch (e) {}
        try {
          window.__DAEMIOS_PROF("chunk.gen.matrix", __dtMatrix * mult);
        } catch (e) {}
        try {
          window.__DAEMIOS_PROF("chunk.gen.color", __dtColor * mult);
        } catch (e) {}
      }
    }
    // After direct writes, ensure flags are set
    if (
      this.topIM &&
      this.topIM.geometry &&
      this.topIM.geometry.attributes &&
      this.topIM.geometry.attributes.iCenter
    )
      this.topIM.geometry.attributes.iCenter.needsUpdate = true;
    if (
      this.topIM &&
      this.topIM.geometry &&
      this.topIM.geometry.attributes &&
      this.topIM.geometry.attributes.iScaleY
    )
      this.topIM.geometry.attributes.iScaleY.needsUpdate = true;
    if (
      this.sideIM &&
      this.sideIM.geometry &&
      this.sideIM.geometry.attributes &&
      this.sideIM.geometry.attributes.iCenter
    )
      this.sideIM.geometry.attributes.iCenter.needsUpdate = true;
    if (
      this.sideIM &&
      this.sideIM.geometry &&
      this.sideIM.geometry.attributes &&
      this.sideIM.geometry.attributes.iScaleY
    )
      this.sideIM.geometry.attributes.iScaleY.needsUpdate = true;
    if (this.topIM && this.topIM.instanceColor)
      this.topIM.instanceColor.needsUpdate = true;
    if (this.sideIM && this.sideIM.instanceColor)
      this.sideIM.instanceColor.needsUpdate = true;
  }
  // A time-sliced variant that fills a chunk progressively, resuming from task.state
  _fillChunkSlice(task, budgetRows = 2) {
    // Ensure state
    if (!task.state) {
      task.state = {
        row: 0,
        local: 0,
        baseCol: task.wx * this.chunkCols,
        baseRow: task.wy * this.chunkRows,
        cTop: this.pastelColorForChunk(task.wx, task.wy),
        cSide: null,
      };
      task.state.cSide = task.state.cTop.clone().multiplyScalar(0.8);
    }
    const st = task.state;
    const layoutRadius = this.layoutRadius;
    const hexWidth = layoutRadius * 1.5 * this.spacingFactor;
    const hexHeight = Math.sqrt(3) * layoutRadius * this.spacingFactor;
    const sx = this.modelScaleFactor;
    const hMag = this.heightMagnitude != null ? this.heightMagnitude : 1.0;
    const xzScale = sx * this.contactScale;
    const sideXZ = xzScale * (this.sideInset != null ? this.sideInset : 0.996);
    const useChunkColors = !!this.features.chunkColors;

    const writeCenter = (arr2, idx2, x, z) => {
      arr2[idx2] = x;
      arr2[idx2 + 1] = z;
    };

    let rowsDone = 0;
    // Prepare sampled sub-timers on the task (persist across slices)
    if (task && !task.__profSub) {
      task.__profSub = { cell: 0, matrix: 0, color: 0, samples: 0 };
    }
    while (st.row < this.chunkRows && rowsDone < budgetRows) {
      const row = st.row;
      for (let col = 0; col < this.chunkCols; col += 1) {
        const gCol = st.baseCol + col;
        const gRow = st.baseRow + row;
        const q = gCol;
        const r = gRow - Math.floor(gCol / 2);
        const x = hexWidth * q;
        const z = hexHeight * (r + q / 2);
        // Sampled timings per ~32 tiles
        const __doSample = (st.local & 31) === 0;
        let __t0;
        if (__doSample)
          __t0 =
            typeof performance !== "undefined" && performance.now
              ? performance.now()
              : Date.now();
        const cell = this.world ? this.world.getCell(q, r) : null;
        if (__doSample)
          task.__profSub.cell +=
            (typeof performance !== "undefined" && performance.now
              ? performance.now()
              : Date.now()) - __t0;
        const isWater = !!(
          cell &&
          (cell.biome === "deepWater" || cell.biome === "shallowWater")
        );
        if (__doSample) {
          __t0 =
            typeof performance !== "undefined" && performance.now
              ? performance.now()
              : Date.now();
        }
        const instIdx = task.startIdx + st.local;
        // Write attribute center/scale
        if (this._ctrArrTop && this._scyArrTop) {
          writeCenter(this._ctrArrTop, instIdx * 2, x, z);
          this._scyArrTop[instIdx] = sx * (cell ? cell.yScale : 1.0) * hMag;
        }
        const sideY = isWater
          ? Math.max(0.001, 0.02 * (this.modelScaleFactor || 1))
          : sx * (cell ? cell.yScale : 1.0) * hMag;
        if (this._ctrArrSide && this._scyArrSide) {
          writeCenter(this._ctrArrSide, instIdx * 2, x, z);
          this._scyArrSide[instIdx] = sideY;
        }
        if (__doSample) {
          task.__profSub.matrix +=
            (typeof performance !== "undefined" && performance.now
              ? performance.now()
              : Date.now()) - __t0;
          __t0 =
            typeof performance !== "undefined" && performance.now
              ? performance.now()
              : Date.now();
          task.__profSub.samples += 1;
        }
        if (useChunkColors) {
          if (this._colArrTop) {
            const o = instIdx * 3;
            this._colArrTop[o] = st.cTop.r;
            this._colArrTop[o + 1] = st.cTop.g;
            this._colArrTop[o + 2] = st.cTop.b;
          } else {
            this.topIM.setColorAt(instIdx, st.cTop);
          }
          if (this._colArrSide) {
            const o2 = instIdx * 3;
            this._colArrSide[o2] = st.cSide.r;
            this._colArrSide[o2 + 1] = st.cSide.g;
            this._colArrSide[o2 + 2] = st.cSide.b;
          } else {
            this.sideIM.setColorAt(instIdx, st.cSide);
          }
        } else {
          const topC = cell ? cell.colorTop : st.cTop;
          const sideC = cell ? cell.colorSide : st.cSide;
          if (this._colArrTop) {
            const o = instIdx * 3;
            this._colArrTop[o] = topC.r;
            this._colArrTop[o + 1] = topC.g;
            this._colArrTop[o + 2] = topC.b;
          } else {
            this.topIM.setColorAt(instIdx, topC);
          }
          if (this._colArrSide) {
            const o2 = instIdx * 3;
            this._colArrSide[o2] = sideC.r;
            this._colArrSide[o2 + 1] = sideC.g;
            this._colArrSide[o2 + 2] = sideC.b;
          } else {
            this.sideIM.setColorAt(instIdx, sideC);
          }
        }
        if (__doSample) {
          task.__profSub.color +=
            (typeof performance !== "undefined" && performance.now
              ? performance.now()
              : Date.now()) - __t0;
        }
        this.indexToQR[instIdx] = {
          q,
          r,
          wx: task.wx,
          wy: task.wy,
          col: gCol,
          row: gRow,
        };
        st.local += 1;
      }
      st.row += 1;
      rowsDone += 1;
      // Update progressive visible count (since tasks are packed sequentially)
      this._writtenUntil = Math.max(
        this._writtenUntil,
        task.startIdx + st.local
      );
    }
    const done = st.row >= this.chunkRows;
    return done;
  }

  setCenterChunk(wx, wy, options = {}) {
    if (!this.topIM || !this.sideIM) return;
    // Cancel any in-flight streaming build
    this._cancelStreamingBuild();

    // If whole-hex radial fade culling is active, skip chunks that cannot contribute
    const ufTop = this._fadeUniforms && this._fadeUniforms.top;
    const doCull = !!(
      ufTop &&
      ufTop.uFadeEnabled &&
      ufTop.uFadeEnabled.value === 1 &&
      ufTop.uCullWholeHex &&
      ufTop.uCullWholeHex.value === 1
    );
    const fadeCenter =
      doCull && ufTop.uFadeCenter && ufTop.uFadeCenter.value
        ? ufTop.uFadeCenter.value
        : null;
    const fadeRadius =
      doCull && ufTop.uFadeRadius ? ufTop.uFadeRadius.value : 0;
    const fadeCorner =
      doCull && ufTop.uHexCornerRadius ? ufTop.uHexCornerRadius.value : 0;
    const layoutRadius = this.layoutRadius;
    const hexWidth = layoutRadius * 1.5 * this.spacingFactor;
    const hexHeight = Math.sqrt(3) * layoutRadius * this.spacingFactor;

    // Determine desired chunks for new center
    const totalSlots = this.neighborOffsets.length;
    const desired = [];
    const desiredKeys = new Set();
    for (let i = 0; i < totalSlots; i += 1) {
      const off = this.neighborOffsets[i];
      const cw = wx + off.dx;
      const cy = wy + off.dy;
      const key = `${cw},${cy}`;
      desired.push({ wx: cw, wy: cy, key });
      desiredKeys.add(key);
    }

    const tasks = [];
    if (this._chunkToSlot.size === 0) {
      // First-time build: assign all desired into their index-matched slots
      for (let i = 0; i < totalSlots; i += 1) {
        const d = desired[i];
        this._slotAssignments[i] = { wx: d.wx, wy: d.wy };
        this._chunkToSlot.set(d.key, i);
        this._slotProgress[i] = false;
        tasks.push({
          slotIndex: i,
          wx: d.wx,
          wy: d.wy,
          startIdx: i * this.countPerChunk,
        });
      }
    } else {
      // Compute keepers (present in both old and new) and leavers (present before, not now)
      const reservedSlots = new Set();
      const leaverSlots = [];
      for (const [key, slot] of this._chunkToSlot.entries()) {
        if (desiredKeys.has(key)) {
          reservedSlots.add(slot);
        } else {
          leaverSlots.push(slot);
        }
      }
      const forceRefill = options && options.forceRefill === true;
      if (forceRefill) {
        // Force rebuild all desired chunks regardless of previous progress
        for (const d of desired) {
          const slot = this._chunkToSlot.get(d.key);
          if (typeof slot === "number") {
            // Keep assignment stable and mark as not finished
            this._slotAssignments[slot] = { wx: d.wx, wy: d.wy };
            this._slotProgress[slot] = false;
            tasks.push({
              slotIndex: slot,
              wx: d.wx,
              wy: d.wy,
              startIdx: slot * this.countPerChunk,
            });
            reservedSlots.add(slot);
          }
        }
      } else {
        // Re-enqueue any keeper slot that didn't finish last build so it completes across rapid moves
        for (const [key, slot] of this._chunkToSlot.entries()) {
          if (desiredKeys.has(key) && this._slotProgress[slot] !== true) {
            const [cwStr, cyStr] = key.split(",");
            const cw = parseInt(cwStr, 10);
            const cy = parseInt(cyStr, 10);
            tasks.push({
              slotIndex: slot,
              wx: cw,
              wy: cy,
              startIdx: slot * this.countPerChunk,
            });
          }
        }
      }
      // Build list of arrivals (in desired but not in old)
      const arrivals = desired.filter((d) => !this._chunkToSlot.has(d.key));
      // Assign arrivals to freed slots; fallback to any unreserved slot if needed
      let freeIter = 0;
      const isReserved = (idx) => reservedSlots.has(idx);
      const nextUnreserved = () => {
        while (freeIter < totalSlots) {
          if (!isReserved(freeIter)) return freeIter++;
          freeIter += 1;
        }
        return -1;
      };
      const freeSlotsQueue = leaverSlots.slice();
      for (const arr of arrivals) {
        let slotIndex =
          freeSlotsQueue.length > 0 ? freeSlotsQueue.shift() : nextUnreserved();
        if (slotIndex < 0) slotIndex = 0;
        this._slotAssignments[slotIndex] = { wx: arr.wx, wy: arr.wy };
        this._chunkToSlot.set(arr.key, slotIndex);
        reservedSlots.add(slotIndex);
        this._slotProgress[slotIndex] = false;
        tasks.push({
          slotIndex,
          wx: arr.wx,
          wy: arr.wy,
          startIdx: slotIndex * this.countPerChunk,
        });
      }
      // Cleanup leavers from reverse map
      for (const slot of leaverSlots) {
        for (const [k, s] of this._chunkToSlot.entries()) {
          if (s === slot && !desiredKeys.has(k)) {
            this._chunkToSlot.delete(k);
            break;
          }
        }
      }
    }

    // While streaming, temporarily disable radial fade discard on tiles and the trail to avoid abrupt dropouts
    this._fadePrevEnabledTop =
      this._fadeUniforms &&
      this._fadeUniforms.top &&
      this._fadeUniforms.top.uFadeEnabled
        ? this._fadeUniforms.top.uFadeEnabled.value
        : 0;
    this._fadePrevEnabledSide =
      this._fadeUniforms &&
      this._fadeUniforms.side &&
      this._fadeUniforms.side.uFadeEnabled
        ? this._fadeUniforms.side.uFadeEnabled.value
        : 0;
    this._fadePrevEnabledTopTrail =
      this._fadeUniformsTrail &&
      this._fadeUniformsTrail.top &&
      this._fadeUniformsTrail.top.uFadeEnabled
        ? this._fadeUniformsTrail.top.uFadeEnabled.value
        : 0;
    this._fadePrevEnabledSideTrail =
      this._fadeUniformsTrail &&
      this._fadeUniformsTrail.side &&
      this._fadeUniformsTrail.side.uFadeEnabled
        ? this._fadeUniformsTrail.side.uFadeEnabled.value
        : 0;
    if (
      this._fadeUniforms &&
      this._fadeUniforms.top &&
      this._fadeUniforms.top.uFadeEnabled
    )
      this._fadeUniforms.top.uFadeEnabled.value = 0;
    if (
      this._fadeUniforms &&
      this._fadeUniforms.side &&
      this._fadeUniforms.side.uFadeEnabled
    )
      this._fadeUniforms.side.uFadeEnabled.value = 0;
    if (
      this._fadeUniformsDepth &&
      this._fadeUniformsDepth.top &&
      this._fadeUniformsDepth.top.uFadeEnabled
    )
      this._fadeUniformsDepth.top.uFadeEnabled.value = 0;
    if (
      this._fadeUniformsDepth &&
      this._fadeUniformsDepth.side &&
      this._fadeUniformsDepth.side.uFadeEnabled
    )
      this._fadeUniformsDepth.side.uFadeEnabled.value = 0;
    if (
      this._fadeUniformsTrail &&
      this._fadeUniformsTrail.top &&
      this._fadeUniformsTrail.top.uFadeEnabled
    )
      this._fadeUniformsTrail.top.uFadeEnabled.value = 0;
    if (
      this._fadeUniformsTrail &&
      this._fadeUniformsTrail.side &&
      this._fadeUniformsTrail.side.uFadeEnabled
    )
      this._fadeUniformsTrail.side.uFadeEnabled.value = 0;
    if (
      this._fadeUniformsDepthTrail &&
      this._fadeUniformsDepthTrail.top &&
      this._fadeUniformsDepthTrail.top.uFadeEnabled
    )
      this._fadeUniformsDepthTrail.top.uFadeEnabled.value = 0;
    if (
      this._fadeUniformsDepthTrail &&
      this._fadeUniformsDepthTrail.side &&
      this._fadeUniformsDepthTrail.side.uFadeEnabled
    )
      this._fadeUniformsDepthTrail.side.uFadeEnabled.value = 0;

    // Notify host that streaming is starting
    if (this._onBuildStart) {
      try {
        this._onBuildStart();
      } catch (e) {}
    }
    // Start streaming build with a fresh token
    const token = ++this._buildToken;
    // Attach per-task state and ensure increasing startIdx order
    this._buildQueue = tasks.map((t) => ({ ...t, state: null }));
    this._buildCursor = 0;
    // Record queue timing and size
    this._queueStartTime =
      typeof performance !== "undefined" && performance.now
        ? performance.now()
        : Date.now();
    this._queueTaskCount = this._buildQueue.length;
    this._queueDoneCount = 0;
    // Mild first-load boost: if nothing visible yet, temporarily raise throughput
    if ((this.topIM.count | 0) === 0 || (this.sideIM.count | 0) === 0) {
      this._savedBudget = this.streamBudgetMs;
      this._savedRowsPerSlice = this.rowsPerSlice;
      this.streamBudgetMs = Math.max(this.streamBudgetMs, 12);
      this.rowsPerSlice = Math.max(this.rowsPerSlice, 8);
      if (typeof window !== "undefined" && window.__DAEMIOS_PROF) {
        try {
          window.__DAEMIOS_PROF("stream.config.budget", this.streamBudgetMs);
        } catch (e) {}
        try {
          window.__DAEMIOS_PROF("stream.config.rows", this.rowsPerSlice);
        } catch (e) {}
      }
    }
    // Store target final count for this build (accounts for any culling)
    // Since we are only updating arrivals, the total visible count should remain unchanged during streaming.
    this._targetCount = this.neighborOffsets.length * this.countPerChunk;
    // Keep previous counts visible while streaming new content; on first pass, ramp up from 0
    this._writtenUntil = Math.min(this.topIM.count | 0, this.indexToQR.length);
    if ((this._writtenUntil | 0) === 0) {
      // Show at least the range up to first task start to make progress visible
      if (tasks.length > 0)
        this._writtenUntil = Math.max(this._writtenUntil, tasks[0].startIdx);
    }
    // Clamp previous visible counts to whole-chunk boundaries to avoid showing partial chunks
    const prevTop = this.topIM.count | 0;
    const prevSide = this.sideIM.count | 0;
    const prevSafeTop =
      Math.floor(prevTop / this.countPerChunk) * this.countPerChunk;
    const prevSafeSide =
      Math.floor(prevSide / this.countPerChunk) * this.countPerChunk;
    this._prevVisibleTop = prevSafeTop;
    this._prevVisibleSide = prevSafeSide;
    if (this.topIM.count !== prevSafeTop) this.topIM.count = prevSafeTop;
    if (this.sideIM.count !== prevSafeSide) this.sideIM.count = prevSafeSide;
    this._scheduleStreamingTick(token);
  }

  applyChunkColors(enabled) {
    if (!this.topIM || !this.sideIM || !this.indexToQR) return;
    const count = this.topIM
      ? this.topIM.count
      : this.indexToQR
      ? this.indexToQR.length
      : 0;
    const tmpTop = new THREE.Color();
    const tmpSide = new THREE.Color();
    for (let i = 0; i < count; i += 1) {
      const info = this.indexToQR[i];
      if (!info) continue;
      if (enabled) {
        const c = this.pastelColorForChunk(info.wx || 0, info.wy || 0);
        const s = tmpSide.copy(c).multiplyScalar(0.8);
        this.topIM.setColorAt(i, c);
        this.sideIM.setColorAt(i, s);
      } else {
        const cell = this.world ? this.world.getCell(info.q, info.r) : null;
        const c = cell ? cell.colorTop : tmpTop.set(0xffffff);
        const s = cell ? cell.colorSide : tmpSide.copy(c).multiplyScalar(0.85);
        this.topIM.setColorAt(i, c);
        this.sideIM.setColorAt(i, s);
      }
    }
    if (this.topIM.instanceColor) this.topIM.instanceColor.needsUpdate = true;
    if (this.sideIM.instanceColor) this.sideIM.instanceColor.needsUpdate = true;
    // No material recompile needed when only colors change
  }

  dispose() {
    const disposeIM = (im) => {
      if (!im) return;
      try {
        this.scene.remove(im);
      } catch (e) {}
      try {
        if (im.material && im.material.dispose) im.material.dispose();
      } catch (e) {}
      try {
        if (im.customDepthMaterial && im.customDepthMaterial.dispose)
          im.customDepthMaterial.dispose();
      } catch (e) {}
      try {
        if (im.customDistanceMaterial && im.customDistanceMaterial.dispose)
          im.customDistanceMaterial.dispose();
      } catch (e) {}
    };
    disposeIM(this.topIM);
    disposeIM(this.sideIM);
    disposeIM(this.trailTopIM);
    disposeIM(this.trailSideIM);
    this.topIM = null;
    this.sideIM = null;
    this.trailTopIM = null;
    this.trailSideIM = null;
  }

  // --- Streaming helpers ---
  _cancelStreamingBuild() {
    this._buildQueue = null;
    this._buildCursor = 0;
    this._buildToken += 1; // invalidate any pending tick
    if (this._rafId != null && typeof cancelAnimationFrame === "function") {
      try {
        cancelAnimationFrame(this._rafId);
      } catch (e) {}
    }
    if (this._idleId != null && typeof cancelIdleCallback === "function") {
      try {
        cancelIdleCallback(this._idleId);
      } catch (e) {}
    }
    this._rafId = null;
    this._idleId = null;
  }

  _scheduleStreamingTick(token) {
    const run = () => this._processStreamingTick(token);
    // Use rAF for predictable, steady progress every frame
    if (typeof requestAnimationFrame === "function") {
      this._rafId = requestAnimationFrame(() => run());
    } else {
      // Fallback
      setTimeout(run, 0);
    }
  }

  _processStreamingTick(token) {
    if (!this._buildQueue || token !== this._buildToken) return; // canceled or superseded
    const tStart =
      typeof performance !== "undefined" && performance.now
        ? performance.now()
        : Date.now();
    let chunksDone = 0;
    // profiler: mark tick start
    const __profTickStart = tStart;

    while (this._buildCursor < this._buildQueue.length) {
      const task = this._buildQueue[this._buildCursor];
      // profiler: mark per-chunk start once
      if (task && task.__profChunkStart == null) {
        task.__profChunkStart =
          typeof performance !== "undefined" && performance.now
            ? performance.now()
            : Date.now();
      }
      // Fill a slice (few rows) of current chunk
      const __sliceT0 =
        typeof performance !== "undefined" && performance.now
          ? performance.now()
          : Date.now();
      const finished = this._fillChunkSlice(task, this.rowsPerSlice); // tunable rows per slice
      if (typeof window !== "undefined" && window.__DAEMIOS_PROF) {
        const dtSlice =
          (typeof performance !== "undefined" && performance.now
            ? performance.now()
            : Date.now()) - __sliceT0;
        try {
          window.__DAEMIOS_PROF("stream.fillSlice", dtSlice);
        } catch (e) {}
      }
      // Update visible counts progressively (tasks are packed sequentially)
      const safeUntil =
        Math.floor(this._writtenUntil / this.countPerChunk) *
        this.countPerChunk;
      this.topIM.count = Math.max(this._prevVisibleTop || 0, safeUntil);
      this.sideIM.count = Math.max(this._prevVisibleSide || 0, safeUntil);

      // Check budget after each slice, not only per-chunk
      const tNow =
        typeof performance !== "undefined" && performance.now
          ? performance.now()
          : Date.now();
      const elapsed = tNow - tStart;
      if (elapsed >= this.streamBudgetMs) {
        if (
          this.topIM &&
          this.topIM.geometry &&
          this.topIM.geometry.attributes &&
          this.topIM.geometry.attributes.iCenter
        )
          this.topIM.geometry.attributes.iCenter.needsUpdate = true;
        if (
          this.topIM &&
          this.topIM.geometry &&
          this.topIM.geometry.attributes &&
          this.topIM.geometry.attributes.iScaleY
        )
          this.topIM.geometry.attributes.iScaleY.needsUpdate = true;
        if (
          this.sideIM &&
          this.sideIM.geometry &&
          this.sideIM.geometry.attributes &&
          this.sideIM.geometry.attributes.iCenter
        )
          this.sideIM.geometry.attributes.iCenter.needsUpdate = true;
        if (
          this.sideIM &&
          this.sideIM.geometry &&
          this.sideIM.geometry.attributes &&
          this.sideIM.geometry.attributes.iScaleY
        )
          this.sideIM.geometry.attributes.iScaleY.needsUpdate = true;
        if (
          this.trailTopIM &&
          this.trailTopIM.geometry &&
          this.trailTopIM.geometry.attributes &&
          this.trailTopIM.geometry.attributes.iCenter
        )
          this.trailTopIM.geometry.attributes.iCenter.needsUpdate = true;
        if (
          this.trailTopIM &&
          this.trailTopIM.geometry &&
          this.trailTopIM.geometry.attributes &&
          this.trailTopIM.geometry.attributes.iScaleY
        )
          this.trailTopIM.geometry.attributes.iScaleY.needsUpdate = true;
        if (
          this.trailSideIM &&
          this.trailSideIM.geometry &&
          this.trailSideIM.geometry.attributes &&
          this.trailSideIM.geometry.attributes.iCenter
        )
          this.trailSideIM.geometry.attributes.iCenter.needsUpdate = true;
        if (
          this.trailSideIM &&
          this.trailSideIM.geometry &&
          this.trailSideIM.geometry.attributes &&
          this.trailSideIM.geometry.attributes.iScaleY
        )
          this.trailSideIM.geometry.attributes.iScaleY.needsUpdate = true;
        if (this.topIM.instanceColor)
          this.topIM.instanceColor.needsUpdate = true;
        if (this.sideIM.instanceColor)
          this.sideIM.instanceColor.needsUpdate = true;
        // profiler: record tick
        if (typeof window !== "undefined" && window.__DAEMIOS_PROF) {
          try {
            window.__DAEMIOS_PROF("stream.tick", elapsed);
            const done = this._queueDoneCount || 0;
            const total = this._queueTaskCount || 0;
            const eNow =
              typeof performance !== "undefined" && performance.now
                ? performance.now()
                : Date.now();
            const eElapsed = eNow - (this._queueStartTime || eNow);
            const rate = eElapsed > 0 ? (done / eElapsed) * 1000 : 0; // tasks/sec
            const remain = Math.max(total - done, 0);
            const eta =
              remain === 0 ? 0 : rate > 0 ? (remain / rate) * 1000 : 0;
            window.__DAEMIOS_PROF("stream.queue.done", done);
            window.__DAEMIOS_PROF("stream.queue.totalTasks", total);
            window.__DAEMIOS_PROF("stream.queue.eta", eta);
            window.__DAEMIOS_PROF("stream.queue.rate", rate);
          } catch (e) {}
        }
        this._scheduleStreamingTick(token);
        return;
      }

      if (finished) {
        // profiler: report per-chunk time
        if (task && task.__profChunkStart != null) {
          const __now =
            typeof performance !== "undefined" && performance.now
              ? performance.now()
              : Date.now();
          const __dtChunk = __now - task.__profChunkStart;
          if (typeof window !== "undefined" && window.__DAEMIOS_PROF) {
            try {
              window.__DAEMIOS_PROF("chunk.generate", __dtChunk);
            } catch (e) {}
          }
          delete task.__profChunkStart;
        }
        // profiler: report sub-stage estimates (scaled from samples)
        if (
          task &&
          task.__profSub &&
          typeof window !== "undefined" &&
          window.__DAEMIOS_PROF
        ) {
          const sub = task.__profSub;
          const samples = sub.samples || 1;
          const mult = (this.chunkCols * this.chunkRows) / samples;
          try {
            window.__DAEMIOS_PROF("chunk.gen.cell", sub.cell * mult);
          } catch (e) {}
          try {
            window.__DAEMIOS_PROF("chunk.gen.matrix", sub.matrix * mult);
          } catch (e) {}
          try {
            window.__DAEMIOS_PROF("chunk.gen.color", sub.color * mult);
          } catch (e) {}
          delete task.__profSub;
        }
        // Move to next chunk task
        this._buildCursor += 1;
        this._queueDoneCount += 1;
        if (typeof task.slotIndex === "number" && this._slotProgress) {
          this._slotProgress[task.slotIndex] = true;
        }
        chunksDone += 1;
        if (
          chunksDone === 0 ||
          (this.streamMaxChunksPerTick > 0 &&
            chunksDone >= this.streamMaxChunksPerTick)
        ) {
          if (
            this.topIM &&
            this.topIM.geometry &&
            this.topIM.geometry.attributes &&
            this.topIM.geometry.attributes.iCenter
          )
            this.topIM.geometry.attributes.iCenter.needsUpdate = true;
          if (
            this.topIM &&
            this.topIM.geometry &&
            this.topIM.geometry.attributes &&
            this.topIM.geometry.attributes.iScaleY
          )
            this.topIM.geometry.attributes.iScaleY.needsUpdate = true;
          if (
            this.sideIM &&
            this.sideIM.geometry &&
            this.sideIM.geometry.attributes &&
            this.sideIM.geometry.attributes.iCenter
          )
            this.sideIM.geometry.attributes.iCenter.needsUpdate = true;
          if (
            this.sideIM &&
            this.sideIM.geometry &&
            this.sideIM.geometry.attributes &&
            this.sideIM.geometry.attributes.iScaleY
          )
            this.sideIM.geometry.attributes.iScaleY.needsUpdate = true;
          if (
            this.trailTopIM &&
            this.trailTopIM.geometry &&
            this.trailTopIM.geometry.attributes &&
            this.trailTopIM.geometry.attributes.iCenter
          )
            this.trailTopIM.geometry.attributes.iCenter.needsUpdate = true;
          if (
            this.trailTopIM &&
            this.trailTopIM.geometry &&
            this.trailTopIM.geometry.attributes &&
            this.trailTopIM.geometry.attributes.iScaleY
          )
            this.trailTopIM.geometry.attributes.iScaleY.needsUpdate = true;
          if (
            this.trailSideIM &&
            this.trailSideIM.geometry &&
            this.trailSideIM.geometry.attributes &&
            this.trailSideIM.geometry.attributes.iCenter
          )
            this.trailSideIM.geometry.attributes.iCenter.needsUpdate = true;
          if (
            this.trailSideIM &&
            this.trailSideIM.geometry &&
            this.trailSideIM.geometry.attributes &&
            this.trailSideIM.geometry.attributes.iScaleY
          )
            this.trailSideIM.geometry.attributes.iScaleY.needsUpdate = true;
          if (this.topIM.instanceColor)
            this.topIM.instanceColor.needsUpdate = true;
          if (this.sideIM.instanceColor)
            this.sideIM.instanceColor.needsUpdate = true;
          if (typeof window !== "undefined" && window.__DAEMIOS_PROF) {
            try {
              window.__DAEMIOS_PROF(
                "stream.tick",
                (typeof performance !== "undefined" && performance.now
                  ? performance.now()
                  : Date.now()) - __profTickStart
              );
              const done = this._queueDoneCount || 0;
              const total = this._queueTaskCount || 0;
              const eNow =
                typeof performance !== "undefined" && performance.now
                  ? performance.now()
                  : Date.now();
              const eElapsed = eNow - (this._queueStartTime || eNow);
              const rate = eElapsed > 0 ? (done / eElapsed) * 1000 : 0;
              const remain = Math.max(total - done, 0);
              const eta = rate > 0 ? (remain / rate) * 1000 : 0;
              window.__DAEMIOS_PROF("stream.queue.done", done);
              window.__DAEMIOS_PROF("stream.queue.totalTasks", total);
              window.__DAEMIOS_PROF("stream.queue.eta", remain === 0 ? 0 : eta);
              window.__DAEMIOS_PROF("stream.queue.rate", rate);
            } catch (e) {}
          }
          this._scheduleStreamingTick(token);
          return;
        }
      }
    }

    // All tasks done: final flush
    if (
      this.topIM &&
      this.topIM.geometry &&
      this.topIM.geometry.attributes &&
      this.topIM.geometry.attributes.iCenter
    )
      this.topIM.geometry.attributes.iCenter.needsUpdate = true;
    if (
      this.topIM &&
      this.topIM.geometry &&
      this.topIM.geometry.attributes &&
      this.topIM.geometry.attributes.iScaleY
    )
      this.topIM.geometry.attributes.iScaleY.needsUpdate = true;
    if (
      this.sideIM &&
      this.sideIM.geometry &&
      this.sideIM.geometry.attributes &&
      this.sideIM.geometry.attributes.iCenter
    )
      this.sideIM.geometry.attributes.iCenter.needsUpdate = true;
    if (
      this.sideIM &&
      this.sideIM.geometry &&
      this.sideIM.geometry.attributes &&
      this.sideIM.geometry.attributes.iScaleY
    )
      this.sideIM.geometry.attributes.iScaleY.needsUpdate = true;
    if (
      this.trailTopIM &&
      this.trailTopIM.geometry &&
      this.trailTopIM.geometry.attributes &&
      this.trailTopIM.geometry.attributes.iCenter
    )
      this.trailTopIM.geometry.attributes.iCenter.needsUpdate = true;
    if (
      this.trailTopIM &&
      this.trailTopIM.geometry &&
      this.trailTopIM.geometry.attributes &&
      this.trailTopIM.geometry.attributes.iScaleY
    )
      this.trailTopIM.geometry.attributes.iScaleY.needsUpdate = true;
    if (
      this.trailSideIM &&
      this.trailSideIM.geometry &&
      this.trailSideIM.geometry.attributes &&
      this.trailSideIM.geometry.attributes.iCenter
    )
      this.trailSideIM.geometry.attributes.iCenter.needsUpdate = true;
    if (
      this.trailSideIM &&
      this.trailSideIM.geometry &&
      this.trailSideIM.geometry.attributes &&
      this.trailSideIM.geometry.attributes.iScaleY
    )
      this.trailSideIM.geometry.attributes.iScaleY.needsUpdate = true;
    if (this.topIM.instanceColor) this.topIM.instanceColor.needsUpdate = true;
    if (this.sideIM.instanceColor) this.sideIM.instanceColor.needsUpdate = true;
    this._buildQueue = null;
    this._buildCursor = 0;
    this._writtenUntil = Math.max(this._writtenUntil, this._targetCount);
    const finalCount = Math.min(this._targetCount, this.indexToQR.length);
    this.topIM.count = finalCount;
    this.sideIM.count = finalCount;
    this._prevVisibleTop = this.topIM.count;
    this._prevVisibleSide = this.sideIM.count;
    // Queue total duration
    try {
      if (this._queueStartTime) {
        const now =
          typeof performance !== "undefined" && performance.now
            ? performance.now()
            : Date.now();
        const dt = now - this._queueStartTime;
        if (typeof window !== "undefined" && window.__DAEMIOS_PROF) {
          try {
            // Final numbers
            const done = this._queueTaskCount; // all tasks completed
            const total = this._queueTaskCount;
            const rate = total > 0 ? (total / Math.max(dt, 0.001)) * 1000 : 0; // tasks/sec
            window.__DAEMIOS_PROF("stream.queue.total", dt);
            window.__DAEMIOS_PROF("stream.queue.rate", rate);
            window.__DAEMIOS_PROF("stream.queue.done", done);
            window.__DAEMIOS_PROF("stream.queue.totalTasks", total);
            window.__DAEMIOS_PROF("stream.queue.eta", 0);
          } catch (e) {}
        }
      }
    } catch (e) {}
    // Restore streaming throughput if it was boosted
    if (this._savedBudget != null) {
      this.streamBudgetMs = this._savedBudget;
      this._savedBudget = null;
    }
    if (this._savedRowsPerSlice != null) {
      this.rowsPerSlice = this._savedRowsPerSlice;
      this._savedRowsPerSlice = null;
    }
    if (this._onBuildComplete) {
      try {
        this._onBuildComplete();
      } catch (e) {}
    }
    if (
      this._fadeUniforms &&
      this._fadeUniforms.top &&
      this._fadeUniforms.top.uFadeEnabled
    )
      this._fadeUniforms.top.uFadeEnabled.value = this._fadePrevEnabledTop
        ? 1
        : 0;
    if (
      this._fadeUniforms &&
      this._fadeUniforms.side &&
      this._fadeUniforms.side.uFadeEnabled
    )
      this._fadeUniforms.side.uFadeEnabled.value = this._fadePrevEnabledSide
        ? 1
        : 0;
    if (
      this._fadeUniformsDepth &&
      this._fadeUniformsDepth.top &&
      this._fadeUniformsDepth.top.uFadeEnabled
    )
      this._fadeUniformsDepth.top.uFadeEnabled.value = this._fadePrevEnabledTop
        ? 1
        : 0;
    if (
      this._fadeUniformsDepth &&
      this._fadeUniformsDepth.side &&
      this._fadeUniformsDepth.side.uFadeEnabled
    )
      this._fadeUniformsDepth.side.uFadeEnabled.value = this
        ._fadePrevEnabledSide
        ? 1
        : 0;
    if (
      this._fadeUniformsTrail &&
      this._fadeUniformsTrail.top &&
      this._fadeUniformsTrail.top.uFadeEnabled
    )
      this._fadeUniformsTrail.top.uFadeEnabled.value = this
        ._fadePrevEnabledTopTrail
        ? 1
        : 0;
    if (
      this._fadeUniformsTrail &&
      this._fadeUniformsTrail.side &&
      this._fadeUniformsTrail.side.uFadeEnabled
    )
      this._fadeUniformsTrail.side.uFadeEnabled.value = this
        ._fadePrevEnabledSideTrail
        ? 1
        : 0;
    if (
      this._fadeUniformsDepthTrail &&
      this._fadeUniformsDepthTrail.top &&
      this._fadeUniformsDepthTrail.top.uFadeEnabled
    )
      this._fadeUniformsDepthTrail.top.uFadeEnabled.value = this
        ._fadePrevEnabledTopTrail
        ? 1
        : 0;
    if (
      this._fadeUniformsDepthTrail &&
      this._fadeUniformsDepthTrail.side &&
      this._fadeUniformsDepthTrail.side.uFadeEnabled
    )
      this._fadeUniformsDepthTrail.side.uFadeEnabled.value = this
        ._fadePrevEnabledSideTrail
        ? 1
        : 0;
  }
}
