// client/src/3d2/domain/world/adapters/sharedWorldgen.js
// ESM adapter for the shared worldgen.

import * as shared from '../../../../../shared/lib/worldgen/index.js';

export function generateTile(seed, q, r, cfg) {
  return shared.generateTile(seed, q, r, cfg);
}

export function getDefaultConfig() {
  return shared.getDefaultConfig();
}
