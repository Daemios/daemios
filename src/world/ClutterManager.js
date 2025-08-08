// ClutterManager: placeholder for biome-based ground clutter instancing.
// For now this exposes a minimal shape so WorldMap can prepare hooks without rendering changes.
// Future: switch to InstancedMesh pools per clutter type; spawn rules per biome.

export default class ClutterManager {
  constructor() {
    this.enabled = true;
  }

  // Called once the world/instances are built; can scan cells and prepare spawn lists.
  prepareFromGrid(worldGrid) {
    // no-op for now; choose seeds later
  }

  // Add/remove to scene; currently no geometry is created.
  addTo(scene) {
    // no-op for now
  }
  removeFrom(scene) {
    // no-op for now
  }
}
