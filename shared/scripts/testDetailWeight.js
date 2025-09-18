import { computeTilePart } from '../lib/worldgen/layers/continents.js';

function sample(seed, qStart, qEnd, rStart, rEnd, cfg){
  for (let q=qStart;q<=qEnd;q++){
    const row = [];
    for (let r=rStart;r<=rEnd;r++){
      const ctx = { seed: String(seed), q, r, cfg };
      const part = computeTilePart(ctx);
      row.push((part.elevation && part.elevation.normalized).toFixed(3));
    }
    console.log(`q=${q}:`, row.join(' '));
  }
}

console.log('default detailWeight (in-code default)');
sample('parity-seed', -2,2,-2,2, { layers: { layer1: {} } });

console.log('\ndetailWeight=0.12');
sample('parity-seed', -2,2,-2,2, { layers: { layer1: { detailWeight: 0.12 } } });

console.log('\nscale=48, detailWeight=0.12');
sample('parity-seed', -2,2,-2,2, { layers: { layer1: { detailWeight:0.12, scale:48 } } });
