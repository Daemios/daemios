import { makeSimplex, domainWarp, fbm as fbmFactory } from '../lib/worldgen/utils/noise.js';

const cfg = { fbm: { octaves: 5, lacunarity: 2.0, gain: 0.6 }, desiredLandFraction: 0.4 };
const seed = 'coverage-seed-1';
const noise = makeSimplex(seed);
const fbmCfg = cfg.fbm;
const maskSampler = fbmFactory(noise, Math.max(2, (fbmCfg.octaves || 4) - 1), fbmCfg.lacunarity || 2.0, fbmCfg.gain || 0.5);
const detailSampler = fbmFactory(noise, Math.max(1, (fbmCfg.octaves || 4) - 3), fbmCfg.lacunarity || 2.0, (fbmCfg.gain || 0.5) * 0.6);

function computeMaskAt(x,z){
  const wx = x * 0.002;
  const wz = z * 0.002;
  const warped = domainWarp(noise, wx, wz, { ampA: 0.6, freqA: 0.18, ampB: 0.15, freqB: 1.0 });
  const maskRaw = (maskSampler(warped.x * 0.6, warped.y * 0.6) + 1) / 2;
  const thresh = 1.0 - (cfg.desiredLandFraction * 0.92);
  const mask = (maskRaw <= thresh) ? 0 : ((maskRaw >= thresh+0.28) ? 1 : Math.pow((maskRaw - thresh)/0.28,2)*(3-2*((maskRaw - thresh)/0.28)) );
  const detail = (detailSampler(warped.x * 1.2, warped.y * 1.2) + 1) / 2;
  const h = mask * (0.45 * detail + 0.55 * mask);
  return { maskRaw, mask, detail, h };
}

let countAbove=0, total=0;
for(let r=-10;r<=10;r++){
  for(let q=-10;q<=10;q++){
    const x = q*3.0; const z = r*3.0; // sample spacing
    const v = computeMaskAt(x,z);
    if(v.mask>0) countAbove++;
    total++;
  }
}
console.log('mask fraction:', (countAbove/total).toFixed(3),'countAbove',countAbove,'total',total);

// print some sample values
for(let r=-2;r<=2;r++){
  let row='';
  for(let q=-2;q<=2;q++){
    const x=q*3; const z=r*3;
    const v=computeMaskAt(x,z);
    row += `${v.maskRaw.toFixed(3)}(${v.mask.toFixed(3)}) `;
  }
  console.log(row);
}
