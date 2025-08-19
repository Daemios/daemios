<template>
  <div
    ref="container"
    class="worldmap-scene-wrapper"
    style="width: 100%; height: 100%; position: relative"
  />
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref, nextTick } from "vue";

const container = ref(null);
let sceneInst = null;
let _raf = null;
const ready = ref(false);
let _pendingOnSelect = null;
let _onSelectCallback = null;
let _domEventListener = null;

async function initScene() {
  await nextTick();
  const mod = await import("@/3d2/scenes/WorldMapScene");
  const WorldMapScene = mod.WorldMapScene || mod.default || mod;
  sceneInst = new WorldMapScene(container.value);
  if (sceneInst.init) await sceneInst.init();
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

  function _loop(t) {
    try {
      if (sceneInst && sceneInst.tick) sceneInst.tick(t);
    } catch (e) {
      // keep loop alive
    }
    _raf = requestAnimationFrame(_loop);
  }
  _raf = requestAnimationFrame(_loop);
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
