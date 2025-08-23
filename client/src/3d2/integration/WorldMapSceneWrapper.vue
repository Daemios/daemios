<template>
  <div
    ref="container"
    class="worldmap-scene-wrapper"
    style="width: 100%; height: 100%; position: relative"
  >
    <!-- Debug or World Gen panel mount -->
    <div
      v-if="showDebug"
      style="position: absolute; left: 12px; bottom: 12px; z-index: 2000"
    >
      <DebugPanel @apply="onDebugApply" />
    </div>
    <div
      v-if="showWorldGen"
      style="position: absolute; left: 12px; bottom: 12px; z-index: 2000"
    >
      <WorldGenPanel @apply="onDebugApply" />
    </div>

    <!-- Top-left control panel -->
    <ControlPanel
      :debug-active="showDebug"
      :world-gen-active="showWorldGen"
      @toggle-debug="toggleShowDebug"
      @toggle-worldgen="toggleShowWorldGen"
    />
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref, nextTick } from "vue";
import * as THREE from "three";
import DebugPanel from "@/components/worldmap/DebugPanel.vue";
import WorldGenPanel from "@/components/worldmap/WorldGenPanel.vue";
import ControlPanel from "@/components/worldmap/ControlPanel.vue";

const container = ref(null);
let sceneInst = null;
let _raf = null;
const ready = ref(false);
let _pendingOnSelect = null;
let _onSelectCallback = null;
let _domEventListener = null;
let _resizeObserver = null;
let _windowResizeHandler = null;
const showDebug = ref(true);
const showWorldGen = ref(false);

// Render-on-demand control shared across lifecycle so it can be referenced
// from onBeforeUnmount (removeEventListener) without scope issues.
let renderRequested = true;
function requestRender() {
  renderRequested = true;
}

import { useSettingsStore } from "@/stores/settingsStore";

const settings = useSettingsStore();

function toggleShowDebug() {
  showDebug.value = true;
  showWorldGen.value = false;
}

function toggleShowWorldGen() {
  showWorldGen.value = true;
  showDebug.value = false;
}

async function initScene() {
  await nextTick();
  const mod = await import("@/3d2/scenes/WorldMapScene");
  const WorldMapScene = mod.WorldMapScene || mod.default || mod;
  sceneInst = new WorldMapScene(container.value);
  if (sceneInst.init) await sceneInst.init();
  // Apply runtime performance patches to avoid per-frame allocations in shared classes.
  try {
    // If the scene provides a PlayerMarker instance, monkey-patch its methods to reuse
    // internal temporaries instead of allocating new objects per-frame. This mirrors
    // an optimization we previously applied at source-level but keeps the change
    // local to the WorldMap2 integration layer.
    if (sceneInst && sceneInst.playerMarker) {
      const pm = sceneInst.playerMarker;
      try {
        // Replace _compose to reuse pm._tmpQuat (exists on PlayerMarker) and avoid new Quaternion()
        if (typeof pm._compose === 'function') {
          pm._compose = function () {
            // pm._tmpQuat, pm._scale and pm._pos are preallocated in the PlayerMarker constructor
            const yQuat = this._tmpQuat.setFromAxisAngle({ x: 0, y: 1, z: 0 }, this._yaw);
            this.mesh.matrix.compose(this._pos, yQuat, this._scale);
            this.mesh.visible = true;
          };
        }
        // Replace setWorldPosition to avoid allocating a new quaternion
        if (typeof pm.setWorldPosition === 'function') {
          pm.setWorldPosition = function (posVec3) {
            if (!posVec3) return;
            this._tmpQuat.identity();
            const scale = this._tmpScale || (this._tmpScale = new THREE.Vector3(1,1,1));
            scale.set(1, 1, 1);
            this.mesh.matrix.compose(posVec3, this._tmpQuat, scale);
            this.mesh.visible = true;
            this._pos.copy(posVec3);
          };
        }
      } catch (e) {
        /* ignore runtime patch failures */
      }
    }
  } catch (e) {
    /* ignore */
  }
  // install any pending selection callback
  if (_pendingOnSelect && sceneInst.setOnSelect) {
    try {
      sceneInst.setOnSelect(_pendingOnSelect);
    } catch (e) {
      /* ignore */
    }
    _pendingOnSelect = null;
  }
  // also attach DOM event listener to container to catch select events
  try {
    if (container.value && container.value.addEventListener) {
      _domEventListener = (ev) => {
        try {
          if (_pendingOnSelect && typeof _pendingOnSelect === "function")
            _pendingOnSelect(ev.detail);
        } catch (e) {
          /* ignore */
        }
        try {
          if (_onSelectCallback && typeof _onSelectCallback === "function")
            _onSelectCallback(ev.detail);
        } catch (e) {
          /* ignore */
        }
      };
      container.value.addEventListener("worldmap:select", _domEventListener);
    }
  } catch (e) {
    /* ignore */
  }
  ready.value = true;
  // Expose scene and helpful internals to window for on-demand debugging in dev.
  try {
    // Expose debug handles only in development to avoid leaking internals in prod
    if (import.meta.env && import.meta.env.DEV && typeof window !== 'undefined' && sceneInst) {
      window.__DAEMIOS_SCENE = sceneInst;
      window.__DAEMIOS_WORLD = sceneInst.grid || null;
      window.__DAEMIOS_CHUNK = sceneInst.chunkManager || null;
    }
  } catch (e) {
    /* ignore exposure failures */
  }

  // Apply persisted worldMap settings (map radius, chunk colors, etc.) immediately so
  // presets are respected on initial load.
  try {
    const saved = settings && typeof settings.get === 'function' ? settings.get('worldMap', {}) : {};
    const gen = saved.generation || {};
    const features = saved.features || {};
    const radius = Number(gen.radius || saved.mapRadius || 0) || 0;
    if (radius && sceneInst && typeof sceneInst.setGridRadius === 'function') {
      try { sceneInst.setGridRadius(radius); } catch (e) { /* ignore */ }
    }
    if (typeof features.chunkColors !== 'undefined' && sceneInst && typeof sceneInst.applyChunkColors === 'function') {
      try { sceneInst.applyChunkColors(!!features.chunkColors); } catch (e) { /* ignore */ }
    }
    // Apply saved world generation config (layers, tunables) if present so
    // the scene generator reflects persisted settings on initial load.
    try {
      if (gen && gen.config && sceneInst && typeof sceneInst.applyGeneratorConfig === 'function') {
        try { sceneInst.applyGeneratorConfig(gen.config); } catch (e) { /* ignore */ }
      }
    } catch (e) { /* ignore settings application errors */ }
  } catch (e) {
    /* ignore settings application errors */
  }

  // ensure scene has the correct logical size right away
  try {
    const cw = container.value
      ? container.value.clientWidth
      : window.innerWidth;
    const ch = container.value
      ? container.value.clientHeight
      : window.innerHeight;
    if (sceneInst && typeof sceneInst.resize === "function")
      sceneInst.resize(cw, ch);
  } catch (e) {
    /* ignore */
  }

  // observe container size changes and resize the scene accordingly
  try {
    if (typeof ResizeObserver !== "undefined") {
      _resizeObserver = new ResizeObserver((entries) => {
        try {
          for (const entry of entries) {
            const cr =
              entry.contentRect || entry.target.getBoundingClientRect();
            const w = Math.round(cr.width || 0);
            const h = Math.round(cr.height || 0);
            if (sceneInst && typeof sceneInst.resize === "function")
              sceneInst.resize(w, h);
          }
        } catch (err) {
          /* ignore */
        }
      });
      if (container.value) _resizeObserver.observe(container.value);
    } else {
      // fallback: window resize
      _windowResizeHandler = () => {
        try {
          const w = container.value
            ? container.value.clientWidth
            : window.innerWidth;
          const h = container.value
            ? container.value.clientHeight
            : window.innerHeight;
          if (sceneInst && typeof sceneInst.resize === "function")
            sceneInst.resize(w, h);
        } catch (err) {
          /* ignore */
        }
      };
      window.addEventListener("resize", _windowResizeHandler);
    }
  } catch (e) {
    /* ignore */
  }

  // Hook basic user interactions to request a render
  try {
    if (container.value && container.value.addEventListener) {
      container.value.addEventListener('pointermove', requestRender, { passive: true });
      container.value.addEventListener('pointerdown', requestRender, { passive: true });
      container.value.addEventListener('wheel', requestRender, { passive: true });
      // also resume on focus/key events
      window.addEventListener('keydown', requestRender, { passive: true });
    }
  } catch (e) {
    /* ignore */
  }

  function _loop(t) {
    try {
      if (renderRequested) {
        try {
          if (sceneInst && sceneInst.tick) sceneInst.tick(t);
        } catch (e) {
          // swallow per-frame errors
        }
        renderRequested = false;
      }
    } catch (e) {
      // keep loop alive
    }
    _raf = requestAnimationFrame(_loop);
  }
  // start loop
  _raf = requestAnimationFrame(_loop);
}

function onDebugApply(payload) {
  // payload: { mapRadius, sizePreset, chunkColors, clutter, shadows, water, directions }
  try {
    if (!payload || typeof payload !== "object") return;
    // Only forward mapRadius when explicitly provided by the sender. Avoid
    // defaulting to 1 which can shrink the visible neighborhood unexpectedly
    // when WorldGenPanel doesn't include a mapRadius value.
    if (payload.hasOwnProperty('mapRadius') && payload.mapRadius != null && payload.mapRadius !== '') {
      const r = Number(payload.mapRadius) || 0;
      if (r > 0 && sceneInst && typeof sceneInst.setGridRadius === "function") {
        try { sceneInst.setGridRadius(r); } catch (e) { /*ignore*/ }
      }
    }
    // apply chunk colors toggle if available
    if (sceneInst && typeof sceneInst.applyChunkColors === "function") {
      try {
        sceneInst.applyChunkColors(!!payload.chunkColors);
      } catch (e) {
        /*ignore*/
      }
    }
    // request clutter commit if scene exposes chunk manager hooks
    try {
      if (
        sceneInst &&
        typeof sceneInst.commitClutterForNeighborhood === "function"
      ) {
        sceneInst.commitClutterForNeighborhood();
      }
    } catch (e) {
      /*ignore*/
    }
    // apply generator config if provided so layer toggles take effect
    try {
      if (payload.generationConfig && sceneInst && typeof sceneInst.applyGeneratorConfig === 'function') {
        sceneInst.applyGeneratorConfig(payload.generationConfig);
      }
    } catch (e) { /* ignore */ }
    // persist the same values to settings store as a single source of truth
    try {
      if (settings && typeof settings.mergeAtPath === "function") {
        settings.mergeAtPath({
          path: "worldMap",
          value: {
            features: {
              clutter: !!payload.clutter,
              shadows: !!payload.shadows,
              water: !!payload.water,
              chunkColors: !!payload.chunkColors,
              directions: !!payload.directions,
            },
            generation: {
              radius: Number(payload.mapRadius) || 1,
              sizePreset: payload.sizePreset,
            },
          },
        });
      }
    } catch (e) {
      /* ignore */
    }
  } catch (e) {
    /* ignore handler errors */
  }
}

onMounted(() => initScene());

onBeforeUnmount(() => {
  if (sceneInst && sceneInst.dispose) sceneInst.dispose();
  if (_raf) cancelAnimationFrame(_raf);
  try {
    if (container.value && _domEventListener)
      container.value.removeEventListener("worldmap:select", _domEventListener);
  } catch (e) {
    /* ignore */
  }
  try {
    if (container.value && container.value.removeEventListener) {
      container.value.removeEventListener('pointermove', requestRender);
      container.value.removeEventListener('pointerdown', requestRender);
      container.value.removeEventListener('wheel', requestRender);
      window.removeEventListener('keydown', requestRender);
    }
  } catch (e) {
    /* ignore */
  }
  try {
    if (_resizeObserver && container.value)
      _resizeObserver.unobserve(container.value);
  } catch (e) {
    /* ignore */
  }
  try {
    if (_windowResizeHandler)
      window.removeEventListener("resize", _windowResizeHandler);
  } catch (e) {
    /* ignore */
  }
});

function setGridRadius(r) {
  if (sceneInst && sceneInst.setGridRadius) sceneInst.setGridRadius(r);
}

function showEntities(entities) {
  if (sceneInst && sceneInst.showEntities) sceneInst.showEntities(entities);
}

function onSelect(cb) {
  if (sceneInst && sceneInst.setOnSelect) {
    // store locally so DOM events can also forward
    _onSelectCallback = cb;
    sceneInst.setOnSelect(cb);
    return;
  }
  // buffer the callback until scene is initialized
  _pendingOnSelect = cb;
}

function getSelected() {
  if (!sceneInst || !sceneInst.getSelected) return null;
  return sceneInst.getSelected();
}

function centerOn(q, r) {
  if (sceneInst && sceneInst.centerOn) sceneInst.centerOn(q, r);
}

function zoomTo(d) {
  if (sceneInst && sceneInst.zoomTo) sceneInst.zoomTo(d);
}

function resetView() {
  if (sceneInst && sceneInst.resetView) sceneInst.resetView();
}

defineExpose({
  setGridRadius,
  showEntities,
  onSelect,
  getSelected,
  centerOn,
  zoomTo,
  resetView,
  ready,
});
</script>

<style scoped>
.worldmap-scene-wrapper {
  background: #111;
}
</style>
