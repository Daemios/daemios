import { generateTile } from '../lib/worldgen/index.js';

const seed = 'coverage-seed-1';
const S = 10; // 21x21
let land = 0;
let total = 0;
for (let r = -S; r <= S; r++) {
  for (let q = -S; q <= S; q++) {
    const t = generateTile(seed, { q, r }, {});
    const elev = t && t.elevation && typeof t.elevation.normalized === 'number' ? t.elevation.normalized : 0;
    const seaLevel = (t && t.bathymetry && typeof t.bathymetry.seaLevel === 'number') ? t.bathymetry.seaLevel : 0.2;
    if (elev > seaLevel) land++;
    total++;
  }
}
console.log('land fraction:', (land/total).toFixed(3), 'land tiles', land, 'total', total);
