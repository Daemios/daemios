// Async composer helper: attempts to wire EffectComposer and RenderPass if available.
// Returns a composer instance or null if postprocessing libs are not available.

export async function createComposer(renderer, scene, camera, opts = {}) {
  try {
    const { EffectComposer } = await import('three/examples/jsm/postprocessing/EffectComposer.js');
    const { RenderPass } = await import('three/examples/jsm/postprocessing/RenderPass.js');

    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    return composer;
  } catch (e) {
    return null;
  }
}

export default { createComposer };
