import { axialToXZ, worldXZToAxial } from '../../client/src/3d2/config/layout.js';

function nearlyEqual(a, b, eps = 1e-6) {
  return Math.abs(a - b) <= eps;
}

function verify(range = 20) {
  let failures = 0;
  for (let q = -range; q <= range; q++) {
    for (let r = -range; r <= range; r++) {
      const { x, z } = axialToXZ(q, r, { layoutRadius: 1, spacingFactor: 1 });
      const { q: qf, r: rf } = worldXZToAxial(x, z, { layoutRadius: 1, spacingFactor: 1 });
      const rounded = {
        q: Math.round(qf),
        r: Math.round(rf),
      };
      if (rounded.q !== q || rounded.r !== r) {
        failures++;
        console.log(`Mismatch at ${q},${r} -> round(${qf.toFixed(4)},${rf.toFixed(4)}) => ${rounded.q},${rounded.r}`);
      }
    }
  }
  if (failures === 0) console.log('All round-trips matched for range', range);
  else console.log('Total failures:', failures);
}

verify(40);
