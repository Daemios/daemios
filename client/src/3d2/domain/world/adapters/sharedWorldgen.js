// client/src/3d2/domain/world/adapters/sharedWorldgen.js
// ESM adapter for the shared worldgen.

import * as shared from '../../../../../shared/lib/worldgen/index.js';

export function generateTile(seed, coords, cfg) {
  return shared.generateTile(seed, coords, cfg);
}

export function getDefaultConfig() {
  return shared.getDefaultConfig();
}
