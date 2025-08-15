export async function initClutter(clutter, scene, world) {
  if (!clutter || !scene || !world) return;
  try {
    clutter.addTo(scene);
    clutter.prepareFromGrid(world);
    try {
      await clutter.loadAssets();
    } catch (e) {
      console.debug("clutter.loadAssets failed", e);
    }
  } catch (e) {
    console.debug("initClutter failed", e);
  }
}
