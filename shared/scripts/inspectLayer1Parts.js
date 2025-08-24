import { fbm as fbmFactory, domainWarp } from '../lib/worldgen/noiseUtils.js';
import { makeSimplex } from '../lib/worldgen/noiseFactory.js';
import { axialToXZ } from '../../client/src/3d2/config/layout.js';
import { getDefaultConfig } from '../lib/worldgen/index.js';

function inspect(seed, qStart, qEnd, rStart, rEnd, cfgOverride = {}) {
  const cfg = getDefaultConfig();
  // shallow merge override
  cfg.layers.layer1 = Object.assign({}, cfg.layers.layer1, cfgOverride);
  for (let q = qStart; q <= qEnd; q++) {
    for (let r = rStart; r <= rEnd; r++) {
      const mycfg = cfg.layers.layer1 || {};
      const scale = mycfg.scale || 12.0;
      const { x, z } = axialToXZ(q, r, { layoutRadius: 1, spacingFactor: 1 });
      const noise = makeSimplex(String(seed), x, z);
      // macro
      const macro = (function(){
        const x = q / (mycfg.plateCellSize || 48);
        const y = r / (mycfg.plateCellSize || 48);
        const warpCfg = mycfg.domainWarp || { ampA: 0.8, freqA: 0.3, ampB: 0.25, freqB: 2.0 };
        const warped = domainWarp(noise, x, y, warpCfg);
        const fbmCfg = mycfg.fbm || { octaves: 5, lacunarity: 2.0, gain: 0.5 };
        const macroOctaves = Math.max(3, (fbmCfg.octaves || 5) - 1);
        const macroSampler = fbmFactory(noise, macroOctaves, fbmCfg.lacunarity || 2.0, fbmCfg.gain || 0.5);
        const v = macroSampler(warped.x, warped.y);
        const base = (v + 1) / 2;
        const seaLevel = typeof mycfg.seaLevel === 'number' ? mycfg.seaLevel : 0.52;
        const shallowBand = 0.26;
        let h;
        if (base < seaLevel) h = (base / seaLevel) * shallowBand;
        else h = shallowBand + ((base - seaLevel) / (1 - seaLevel)) * (1 - shallowBand);
        if (h < 0) h = 0; if (h > 1) h = 1;
        return h;
      })();
      // detail
      const detail = (function(){
        const x = q / scale;
        const y = r / scale;
        const warp = domainWarp(noise, x, y, mycfg.domainWarp || {});
        const fbmSampler = fbmFactory(noise, mycfg.fbmOctaves || 4, mycfg.lacunarity || 2.0, mycfg.gain || 0.5);
        const v = fbmSampler(warp.x, warp.y);
        const d = (v + 1) / 2;
        return d;
      })();
      const detailWeight = 0.35;
      const combined = Math.max(0, Math.min(1, macro * (1 - detailWeight) + detail * detailWeight));
      console.log(`q=${q},r=${r} -> macro=${macro.toFixed(3)}, detail=${detail.toFixed(3)}, combined=${combined.toFixed(3)}`);
    }
  }
}

console.log('Inspect default layer1');
inspect('parity-seed', -2, 2, -2, 2);

console.log('\nInspect with larger scale (scale=48)');
inspect('parity-seed', -2, 2, -2, 2, { scale: 48 });

console.log('\nInspect with smaller detailWeight (0.12)');
// To test varying detail weight, we temporarily override it in this script
// (layer01 uses a local constant detailWeight=0.35), so here we'll compute combined with 0.12
(function(){
  const cfg = getDefaultConfig();
  for (let q=-2;q<=2;q++) for (let r=-2;r<=2;r++) {
    const { x, z } = axialToXZ(q, r, { layoutRadius: 1, spacingFactor: 1 });
    const noise = makeSimplex('parity-seed', x, z);
    const scale = cfg.layers.layer1.scale || 12.0;
    const x = q / (cfg.layers.layer1.plateCellSize || 48);
    const y = r / (cfg.layers.layer1.plateCellSize || 48);
    const macro = (function(){
      const warpCfg = cfg.layers.layer1.domainWarp || { ampA: 0.8, freqA: 0.3, ampB: 0.25, freqB: 2.0 };
      const warped = domainWarp(noise, x, y, warpCfg);
      const fbmCfg = cfg.layers.layer1.fbm || { octaves: 5, lacunarity: 2.0, gain: 0.5 };
      const macroOctaves = Math.max(3, (fbmCfg.octaves || 5) - 1);
      const macroSampler = fbmFactory(noise, macroOctaves, fbmCfg.lacunarity || 2.0, fbmCfg.gain || 0.5);
      const v = macroSampler(warped.x, warped.y);
      const base = (v + 1) / 2;
      const seaLevel = typeof cfg.layers.layer1.seaLevel === 'number' ? cfg.layers.layer1.seaLevel : 0.52;
      const shallowBand = 0.26;
      let h;
      if (base < seaLevel) h = (base / seaLevel) * shallowBand;
      else h = shallowBand + ((base - seaLevel) / (1 - seaLevel)) * (1 - shallowBand);
      if (h < 0) h = 0; if (h > 1) h = 1;
      return h;
    })();
    const x2 = q / scale;
    const y2 = r / scale;
    const warp2 = domainWarp(noise, x2, y2, cfg.layers.layer1.domainWarp || {});
    const fbmSampler2 = fbmFactory(noise, cfg.layers.layer1.fbmOctaves || 4, cfg.layers.layer1.lacunarity || 2.0, cfg.layers.layer1.gain || 0.5);
    const v2 = fbmSampler2(warp2.x, warp2.y);
    const detail = (v2 + 1)/2;
    const dw = 0.12;
    const comb = Math.max(0, Math.min(1, macro * (1 - dw) + detail * dw));
    console.log(`q=${q},r=${r} -> macro=${macro.toFixed(3)}, detail=${detail.toFixed(3)}, combined_dw0.12=${comb.toFixed(3)}`);
  }
})();
