/* eslint-disable no-param-reassign */
import { computeNeighborhoodRect } from './clutterCommit';

export function handleSetCenterChunk(manager, wx, wy, options = {}) {
  if (!manager || !manager.neighborhood) return;
  // Skip if center didn't change and assignments already populated
  if (wx === manager.centerChunk.x && wy === manager.centerChunk.y && options.forceRefill !== true) {
    const assigned = !!(manager.neighborhood && manager.neighborhood._chunkToSlot && manager.neighborhood._chunkToSlot.size > 0);
    if (assigned) return;
  }

  const trailMs = options.trailMs != null ? options.trailMs : 3000;
  if (manager.trailActive) {
  try { manager.onExtendTrail(trailMs); } catch (e) { console.debug('onExtendTrail failed', e); }
  } else {
  try { manager.onSnapshotTrail(trailMs); } catch (e) { console.debug('onSnapshotTrail failed', e); }
    manager.trailActive = true;
  }

  // Store rect for clutter union under the trail: previous neighborhood only
  const r = manager.neighborRadius;
  manager._prevNeighborhoodRect = computeNeighborhoodRect(manager.centerChunk, manager.chunkCols, manager.chunkRows, r);

  const prevX = manager.centerChunk.x; const prevY = manager.centerChunk.y;
  manager.centerChunk.x = wx; manager.centerChunk.y = wy;
  const bias = { x: Math.sign(wx - prevX), y: Math.sign(wy - prevY) };

  manager.neighborhood.setCenterChunk(wx, wy, { bias, forceRefill: options.forceRefill === true });

  const delay = (manager.neighborRadius && manager.neighborRadius > 1) ? 120 : 60;
  clearTimeout(manager._clutterTimer);
  manager._clutterTimer = setTimeout(() => manager.commitClutterForNeighborhood(), delay);
}
