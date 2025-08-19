import * as THREE from 'three';

// Minimal renderer manager adapter for 3d2.
// Provides the small API WorldMapScene expects: { renderer, composer?, setSize, render, dispose }
export function createRendererManager(options = {}) {
  const {
    width = 800,
    height = 600,
    container = null,
    scene = null,
    camera = null,
    antialias = true,
    alpha = false,
    clearColor = 0x000000,
  } = options;

  const renderer = new THREE.WebGLRenderer({ antialias, alpha });
  try {
    renderer.setSize(width, height);
    if (typeof window !== 'undefined' && window.devicePixelRatio)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(clearColor, 1);
  } catch (e) {
    // ignore failures in odd environments
  }

  // Manager object exposing a tiny API used by the scene
  const manager = {
    renderer,
    composer: undefined, // optional, not provided by default
    setSize(w, h) {
      try {
        renderer.setSize(w, h);
      } catch (e) {}
      try {
        if (manager.composer && typeof manager.composer.setSize === 'function')
          manager.composer.setSize(w, h);
      } catch (e) {}
    },
    render() {
      try {
        if (manager.composer && typeof manager.composer.render === 'function') {
          manager.composer.render();
          return;
        }
        if (scene && camera) renderer.render(scene, camera);
      } catch (e) {
        // swallow render errors to keep the loop alive
      }
    },
    dispose() {
      try {
        // try to release GL context
        if (renderer.forceContextLoss) renderer.forceContextLoss();
      } catch (e) {}
      try {
        renderer.dispose && renderer.dispose();
      } catch (e) {}
      try {
        const canvas = renderer.domElement;
        if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
      } catch (e) {}
    },
  };

  // Attach canvas to container if provided and it's not already attached.
  try {
    if (container && container.appendChild && renderer.domElement) {
      if (renderer.domElement.parentNode !== container) container.appendChild(renderer.domElement);
    }
  } catch (e) {
    // ignore DOM attach failures
  }

  return manager;
}

export default { createRendererManager };
