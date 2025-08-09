import * as THREE from 'three';
import { markRaw } from 'vue';
import { attachRadialFade, attachRadialFadeDepth } from './radialFade';

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
    this.pastelColorForChunk = opts.pastelColorForChunk || ((wx, wy) => new THREE.Color(0xffffff));

    this.countPerChunk = this.chunkCols * this.chunkRows;
    this.neighborOffsets = this.computeNeighborOffsets(this.neighborRadius);

    this.topIM = null;
    this.sideIM = null;
    this.trailTopIM = null;
    this.trailSideIM = null;
    this.indexToQR = [];
    this._fadeUniforms = null;
    this._fadeUniformsDepth = null;
  }

  computeNeighborOffsets(radius) {
    const out = [];
    for (let dy = -radius; dy <= radius; dy += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        out.push({ dx, dy });
      }
    }
    out.sort((a, b) => (a.dx * a.dx + a.dy * a.dy) - (b.dx * b.dx + b.dy * b.dy));
    return out;
  }

  build() {
    const total = this.neighborOffsets.length * this.countPerChunk;
  const topMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const sideMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    // attach radial fades
    const topRef = attachRadialFade(topMat, { bucketKey: 'top', layoutRadius: this.layoutRadius, contactScale: this.contactScale });
    const sideRef = attachRadialFade(sideMat, { bucketKey: 'side', layoutRadius: this.layoutRadius, contactScale: this.contactScale });
    topMat.defines = Object.assign({}, topMat.defines, { TOP_BUCKET: 1 });
    const topDepth = topMat.clone(); topDepth.depthWrite = true; topDepth.colorWrite = false; const topDepthRef = attachRadialFadeDepth(topDepth, { bucketKey: 'top', layoutRadius: this.layoutRadius, contactScale: this.contactScale });
    const sideDepth = sideMat.clone(); sideDepth.depthWrite = true; sideDepth.colorWrite = false; const sideDepthRef = attachRadialFadeDepth(sideDepth, { bucketKey: 'side', layoutRadius: this.layoutRadius, contactScale: this.contactScale });
    this._fadeUniforms = { top: topRef.top, side: sideRef.side };
    this._fadeUniformsDepth = { top: topDepthRef.top, side: sideDepthRef.side };

    this.topIM = markRaw(new THREE.InstancedMesh(this.topGeom, topMat, total));
    this.sideIM = markRaw(new THREE.InstancedMesh(this.sideGeom, sideMat, total));
    this.topIM.customDepthMaterial = topDepth;
    this.topIM.customDistanceMaterial = topDepth;
    this.sideIM.customDepthMaterial = sideDepth;
    this.sideIM.customDistanceMaterial = sideDepth;
    this.topIM.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.sideIM.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    // pre-create instance colors
    const colorsTop = new Float32Array(total * 3);
    const colorsSide = new Float32Array(total * 3);
    this.topIM.instanceColor = new THREE.InstancedBufferAttribute(colorsTop, 3);
    this.sideIM.instanceColor = new THREE.InstancedBufferAttribute(colorsSide, 3);

    this.indexToQR = new Array(total);
    this.scene.add(this.sideIM);
    this.scene.add(this.topIM);

    // trails: use cloned materials so later changes on live materials don't affect trail appearance
    const topMatTrail = topMat.clone();
    const sideMatTrail = sideMat.clone();
    // Re-attach radial fades for trail materials and mirror TOP_BUCKET define
    const topTrailRef = attachRadialFade(topMatTrail, { bucketKey: 'top', layoutRadius: this.layoutRadius, contactScale: this.contactScale });
    const sideTrailRef = attachRadialFade(sideMatTrail, { bucketKey: 'side', layoutRadius: this.layoutRadius, contactScale: this.contactScale });
    topMatTrail.defines = Object.assign({}, topMatTrail.defines, { TOP_BUCKET: 1 });
    const topDepthTrail = topDepth.clone();
    const sideDepthTrail = sideDepth.clone();
    const topDepthTrailRef = attachRadialFadeDepth(topDepthTrail, { bucketKey: 'top', layoutRadius: this.layoutRadius, contactScale: this.contactScale });
    const sideDepthTrailRef = attachRadialFadeDepth(sideDepthTrail, { bucketKey: 'side', layoutRadius: this.layoutRadius, contactScale: this.contactScale });
    this._fadeUniformsTrail = { top: topTrailRef.top, side: sideTrailRef.side };
    this._fadeUniformsDepthTrail = { top: topDepthTrailRef.top, side: sideDepthTrailRef.side };

    this.trailTopIM = markRaw(new THREE.InstancedMesh(this.topGeom, topMatTrail, total));
    this.trailSideIM = markRaw(new THREE.InstancedMesh(this.sideGeom, sideMatTrail, total));
    this.trailTopIM.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.trailSideIM.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.trailTopIM.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(total * 3), 3);
    this.trailSideIM.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(total * 3), 3);
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

  fillChunk(slotIndex, wx, wy) {
    if (!this.topIM || !this.sideIM) return;
    const layoutRadius = this.layoutRadius;
    const hexWidth = layoutRadius * 1.5 * this.spacingFactor;
    const hexHeight = Math.sqrt(3) * layoutRadius * this.spacingFactor;
    const sx = this.modelScaleFactor;
    const xzScale = sx * this.contactScale;
    const sideXZ = xzScale * (this.sideInset != null ? this.sideInset : 0.996);
    const baseCol = wx * this.chunkCols;
    const baseRow = wy * this.chunkRows;
    const startIdx = slotIndex * this.countPerChunk;
    let local = 0;
    const useChunkColors = !!this.features.chunkColors;
    const cTop = this.pastelColorForChunk(wx, wy);
    const cSide = cTop.clone().multiplyScalar(0.8);
    const dummy = this._transformDummy || (this._transformDummy = markRaw(new THREE.Object3D()));
    for (let row = 0; row < this.chunkRows; row += 1) {
      for (let col = 0; col < this.chunkCols; col += 1) {
        const gCol = baseCol + col;
        const gRow = baseRow + row;
        const q = gCol; // even-q offset -> axial
        const r = gRow - Math.floor(gCol / 2);
        const x = hexWidth * q;
        const z = hexHeight * (r + q / 2);
        const cell = this.world ? this.world.getCell(q, r) : null;
        const isWater = !!(cell && (cell.biome === 'deepWater' || cell.biome === 'shallowWater'));
        dummy.position.set(x, 0, z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(xzScale, sx * (cell ? cell.yScale : 1.0), xzScale);
        dummy.updateMatrix();
        const topMatrix = dummy.matrix.clone();
        const sideY = isWater ? Math.max(0.001, 0.02 * (this.modelScaleFactor || 1)) : (sx * (cell ? cell.yScale : 1.0));
        dummy.scale.set(sideXZ, sideY, sideXZ);
        dummy.updateMatrix();
        const sideMatrix = dummy.matrix.clone();
        const instIdx = startIdx + local;
        this.topIM.setMatrixAt(instIdx, topMatrix);
        this.sideIM.setMatrixAt(instIdx, sideMatrix);
        if (useChunkColors) {
          this.topIM.setColorAt(instIdx, cTop);
          this.sideIM.setColorAt(instIdx, cSide);
        } else {
          const topC = cell ? cell.colorTop : cTop;
          const sideC = cell ? cell.colorSide : cSide;
          this.topIM.setColorAt(instIdx, topC);
          this.sideIM.setColorAt(instIdx, sideC);
        }
        this.indexToQR[instIdx] = { q, r, wx, wy, col: gCol, row: gRow };
        local += 1;
      }
    }
  }

  setCenterChunk(wx, wy) {
    if (!this.topIM || !this.sideIM) return;
    for (let s = 0; s < this.neighborOffsets.length; s += 1) {
      const off = this.neighborOffsets[s];
      this.fillChunk(s, wx + off.dx, wy + off.dy);
    }
    this.topIM.instanceMatrix.needsUpdate = true;
    this.sideIM.instanceMatrix.needsUpdate = true;
    if (this.topIM.instanceColor) this.topIM.instanceColor.needsUpdate = true;
    if (this.sideIM.instanceColor) this.sideIM.instanceColor.needsUpdate = true;
    if (this.topIM.material) this.topIM.material.needsUpdate = true;
    if (this.sideIM.material) this.sideIM.material.needsUpdate = true;
  }

  applyChunkColors(enabled) {
    if (!this.topIM || !this.sideIM || !this.indexToQR) return;
    const count = this.indexToQR.length;
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
    if (this.topIM.material) this.topIM.material.needsUpdate = true;
    if (this.sideIM.material) this.sideIM.material.needsUpdate = true;
  }

  dispose() {
    const disposeIM = (im) => {
      if (!im) return;
      try { this.scene.remove(im); } catch (e) {}
      try { if (im.material && im.material.dispose) im.material.dispose(); } catch (e) {}
      try { if (im.customDepthMaterial && im.customDepthMaterial.dispose) im.customDepthMaterial.dispose(); } catch (e) {}
      try { if (im.customDistanceMaterial && im.customDistanceMaterial.dispose) im.customDistanceMaterial.dispose(); } catch (e) {}
    };
    disposeIM(this.topIM); disposeIM(this.sideIM); disposeIM(this.trailTopIM); disposeIM(this.trailSideIM);
    this.topIM = null; this.sideIM = null; this.trailTopIM = null; this.trailSideIM = null;
  }
}
