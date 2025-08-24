import { generateTile, getDefaultConfig } from '../lib/worldgen/index.js';

function sample(seed, qStart, qEnd, rStart, rEnd, cfgPartial) {
  for (let q = qStart; q <= qEnd; q++) {
    let row = [];
    for (let r = rStart; r <= rEnd; r++) {
      const tile = generateTile(seed, { q, r }, cfgPartial);
      row.push(Number((tile.height ?? (tile.elevation && tile.elevation.normalized) ?? 0).toFixed(3)));
    }
    console.log(`q=${q}:`, row.join(' '));
  }
}

// Quick experiment: sample a 5x5 axial grid around origin with only layer1 enabled
const cfgOnlyLayer1 = { layers: { enabled: { layer0: true, layer1: true, layer2: false, layer3: false, layer3_5: false, layer4: false, layer5: false } } };
console.log('Sample: only layer1 enabled');
sample('parity-seed', -2, 2, -2, 2, cfgOnlyLayer1);

// Compare with all layers enabled
const cfgAll = { layers: { enabled: { layer0: true, layer1: true, layer2: true, layer3: true, layer3_5: true, layer4: true, layer5: true } } };
console.log('\nSample: all layers enabled');
sample('parity-seed', -2, 2, -2, 2, cfgAll);

// Compare with only base (all disabled except layer0 maybe)
const cfgNone = { layers: { enabled: { layer0: true, layer1: false, layer2: false, layer3: false, layer3_5: false, layer4: false, layer5: false } } };
console.log('\nSample: layer1 disabled (fallback)');
sample('parity-seed', -2, 2, -2, 2, cfgNone);
