import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { FXAAShader } from "three/examples/jsm/shaders/FXAAShader.js";
import { createWebGLTimer } from "@/utils/profiler";

// Initialize renderer + composer and return an object of handles.
export function createRendererManager({
  width,
  height,
  container,
  scene,
  camera,
}) {
  const manager = {
    scene,
    camera,
    renderer: null,
    composer: null,
    fxaaPass: null,
    fpsEl: null,
    _gpuTimer: null,
    attach(containerEl) {
      // noop: implemented by init
      void containerEl;
    },
    render() {
      if (manager.composer) manager.composer.render();
      else if (manager.renderer && manager.scene && manager.camera)
        manager.renderer.render(manager.scene, manager.camera);
    },
    setSize(w, h) {
      if (!manager.renderer) return;
      manager.camera.aspect = w / h;
      manager.camera.updateProjectionMatrix();
      manager.renderer.setSize(w, h);
      if (manager.composer) manager.composer.setSize(w, h);
      const pr = manager.renderer.getPixelRatio();
      if (manager.fxaaPass)
        manager.fxaaPass.material.uniforms.resolution.value.set(
          1 / (w * pr),
          1 / (h * pr)
        );
    },
    dispose() {
      try {
        if (
          manager.renderer &&
          manager.renderer.domElement &&
          manager.renderer.domElement.parentNode
        )
          manager.renderer.domElement.parentNode.removeChild(
            manager.renderer.domElement
          );
      } catch (e) {
        // ignore
      }
      if (manager.fpsEl && manager.fpsEl.parentNode)
        manager.fpsEl.parentNode.removeChild(manager.fpsEl);
      manager.composer = null;
      manager.renderer = null;
      manager.fxaaPass = null;
    },
  };

  // Create renderer
  manager.renderer = new THREE.WebGLRenderer({
    antialias: false,
    stencil: false,
  });
  const devicePR = Math.min(1.5, window.devicePixelRatio || 1);
  manager.renderer.setPixelRatio(devicePR);
  manager.renderer.setSize(width, height);
  if (manager.renderer.outputEncoding !== undefined)
    manager.renderer.outputEncoding = THREE.sRGBEncoding;
  manager.renderer.toneMapping = THREE.ACESFilmicToneMapping;
  manager.renderer.toneMappingExposure = 1.0;
  manager.renderer.physicallyCorrectLights = false;

  // Append to container
  if (container && container.appendChild)
    container.appendChild(manager.renderer.domElement);

  // FPS overlay element
  manager.fpsEl = document.createElement("div");
  Object.assign(manager.fpsEl.style, {
    position: "absolute",
    top: "4px",
    right: "6px",
    padding: "2px 6px",
    background: "rgba(0,0,0,0.4)",
    color: "#fff",
    font: "11px monospace",
    borderRadius: "4px",
    pointerEvents: "none",
    zIndex: 1,
  });
  manager.fpsEl.textContent = "FPS: --";
  if (container && container.appendChild) container.appendChild(manager.fpsEl);

  // GPU timer
  try {
    manager._gpuTimer = createWebGLTimer(manager.renderer);
  } catch (e) {
    // ignore
  }

  // Composer and FXAA
  manager.composer = new EffectComposer(manager.renderer);
  const renderPass = new RenderPass(manager.scene, manager.camera);
  manager.composer.addPass(renderPass);
  manager.fxaaPass = new ShaderPass(FXAAShader);
  manager.fxaaPass.material.uniforms.resolution.value.set(
    1 / (width * devicePR),
    1 / (height * devicePR)
  );
  manager.composer.addPass(manager.fxaaPass);

  return manager;
}
