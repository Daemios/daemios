import { generateTile } from '../lib/worldgen/index.js';

console.log('generateTile with explicit seed:');
console.log(generateTile('explicit-seed', { q: 0, r: 0 }, {}).seed);

console.log('generateTile without seed (should use DEFAULT_CONFIG.seed):');
console.log(generateTile(undefined, { q: 0, r: 0 }, {}).seed);
