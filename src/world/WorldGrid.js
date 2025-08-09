// WorldGrid: produces world cell data (height, biome, colors) independent from rendering.
// Minimal contract:
// - constructor(options): { layoutRadius, gridSize, elevation, noiseConfig }
// - getCell(q, r): returns { q, r, hRaw, h, f, t, biome, colorTop, colorSide }
// - forEach(callback): iterate over axial coords in current bounds
// - toIndex(q,r) / fromIndex(i)

import * as THREE from 'three';
import SimplexNoise from 'simplex-noise';
import { biomeColor, classifyBiome, BIOME_THRESHOLDS } from '@/terrain/biomes';
import { createHexGenerator } from '@/world/generation/HexWorldGenerator';

export default class WorldGrid {
  constructor(opts = {}) {
    this.layoutRadius = opts.layoutRadius ?? 0.5;
    this.gridSize = opts.gridSize ?? 20;
    this.elevation = opts.elevation ?? {
      base: 0.08, max: 1.2, curve: 1.35, minLand: 0.32, shorelineBlend: 0.08,
    };
    this.terrainShape = opts.terrainShape ?? {
      baseFreq: 0.07, mountainFreq: 0.16, mountainThreshold: 0.78,
      mountainStrength: 0.6, plainsExponent: 1.6, mountainExponent: 1.25, finalExponent: 1.25,
    };
  this.seed = opts.seed ?? 1337;
  this.generationScale = opts.generationScale != null ? opts.generationScale : 1.0; // 1.0 = current scale; smaller => closer features
    // Noise
    // Legacy noises (still used for minor shaping like shoreline mask); primary "height/biome" now comes from HexWorldGenerator
    this.heightNoise = new SimplexNoise('height');
    this.foliageNoise = new SimplexNoise('foliage');
    this.temperatureNoise = new SimplexNoise('temperature');
    this.mountainNoise = new SimplexNoise('mountain');
    this.waterMaskNoise = new SimplexNoise('waterMask');

    // New stateless world generator (pure per-hex); we keep one instance to reuse internal noise objects
    this.hexGen = createHexGenerator(this.seed);

    // scratch
    this._tmpColor = new THREE.Color();
  }

  bounds() {
    const s = this.gridSize;
    return { minQ: -s, maxQ: s, minR: -s, maxR: s };
  }

  indexCount() {
    const s = this.gridSize;
    return (2 * s + 1) * (2 * s + 1);
  }

  toIndex(q, r) {
    const s = this.gridSize;
    return (q + s) * (2 * s + 1) + (r + s);
  }

  fromIndex(i) {
    const s = this.gridSize;
    const side = 2 * s + 1;
    const q = Math.floor(i / side) - s;
    const r = (i % side) - s;
    return { q, r };
  }

  forEach(fn) {
    const s = this.gridSize;
    for (let q = -s; q <= s; q += 1) {
      for (let r = -s; r <= s; r += 1) {
        fn(q, r);
      }
    }
  }

  getHeight(q, r) {
    const base = (this.heightNoise.noise2D(q * this.terrainShape.baseFreq, r * this.terrainShape.baseFreq) + 1) / 2;
    const plains = Math.pow(base, this.terrainShape.plainsExponent);
    const mRaw = (this.mountainNoise.noise2D(q * this.terrainShape.mountainFreq + 250, r * this.terrainShape.mountainFreq + 250) + 1) / 2;
    let mountain = 0;
    if (mRaw > this.terrainShape.mountainThreshold) {
      const norm = (mRaw - this.terrainShape.mountainThreshold) / (1 - this.terrainShape.mountainThreshold);
      mountain = Math.pow(norm, this.terrainShape.mountainExponent) * this.terrainShape.mountainStrength;
    }
    let h = plains + mountain;
    h = Math.min(1, Math.max(0, h));
    h = Math.pow(h, this.terrainShape.finalExponent);
    return h;
  }

  getCell(q, r) {
    const maxHeight = this.elevation.max;

    // Use new generator for macro terrain & climate
  const s = (this.generationScale && isFinite(this.generationScale) && this.generationScale > 0) ? this.generationScale : 1.0;
  const qg = q / s; const rg = r / s;
  const gen = this.hexGen.get(qg, rg);
    const hRaw = gen.fields?.h ?? 0; // 0..1 elevation composite
    // Map generator climate to our existing foliage/temp channels used by biomeColor
    const f = gen.fields?.moisture ?? 0.5; // treat moisture as foliage proxy
    const t = gen.fields?.temp ?? 0.5; // climate temperature 0..1

    // Shoreline floor and lake mask (retain subtle shaping so beaches get a lift)
    const waterMask = (this.waterMaskNoise.noise2D((q + 250) * 0.035, (r - 120) * 0.035) + 1) / 2;
    const waterCut = THREE.MathUtils.smoothstep(waterMask, 0.6, 0.85);

    const curved = Math.pow(hRaw, this.elevation.curve);
    let baseScaleY = this.elevation.base + curved * maxHeight;
    baseScaleY = baseScaleY * (1 - 0.35 * waterCut);

    const shoreTop = BIOME_THRESHOLDS.shallowWater;
    const blendRange = this.elevation.shorelineBlend;
    let yScale = baseScaleY;
    let biome = classifyBiome(hRaw);
    if (biome !== 'deepWater' && biome !== 'shallowWater') {
      if (hRaw <= shoreTop + blendRange) {
        const tt = (hRaw - shoreTop) / blendRange;
        const smoothT = tt <= 0 ? 0 : tt >= 1 ? 1 : (tt * tt * (3 - 2 * tt));
        const raised = Math.max(baseScaleY, this.elevation.minLand);
        yScale = THREE.MathUtils.lerp(baseScaleY, raised, smoothT);
      } else if (baseScaleY < this.elevation.minLand) {
        const deficit = (this.elevation.minLand - baseScaleY);
        yScale = baseScaleY + deficit * 0.85;
      }
    }

    const hVisual = Math.max(0, Math.min(1, (yScale - this.elevation.base) / maxHeight));
    biome = classifyBiome(hVisual);
    const colorTop = biomeColor(hVisual, f, t, this._tmpColor.clone());

    // darker side color
    const side = colorTop.clone();
    const hslTmp = { h: 0, s: 0, l: 0 };
    side.getHSL(hslTmp);
    hslTmp.l = Math.min(1, hslTmp.l * 0.55 + 0.25);
    side.setHSL(hslTmp.h, hslTmp.s * 0.5, hslTmp.l);

    // Attach generator outputs for UI/debug/logic without breaking existing consumers
    return {
      q, r,
      hRaw, h: hVisual,
      f, t,
      biome,
      colorTop,
      colorSide: side,
      yScale,
      gen, // full generator record (biomeMajor, biomeSub, bands, flags, render hints, fields)
    };
  }
}
