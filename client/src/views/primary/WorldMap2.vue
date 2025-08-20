<template>
  <div ref="sceneContainer" class="world-map position-relative w-100 h-screen">
    <!-- Scene fills the container -->
    <div
      class="scene-fill"
      style="width: 100%; height: 100%; position: relative"
    >
      <WorldMapSceneWrapper ref="sceneWrapper" />
    </div>

    <!-- Live metrics panel -->
    <LiveMetricsPanel :scene-wrapper="sceneWrapper" />
  </div>
</template>

<script setup>
import { ref } from "vue";
import WorldMapSceneWrapper from "@/3d2/integration/WorldMapSceneWrapper.vue";
import LiveMetricsPanel from "@/components/LiveMetricsPanel.vue";

const sceneWrapper = ref(null);
</script>

<style scoped>
/* Make sure the world-map root fills the viewport so child 100% heights work */
.world-map {
  width: 100%;
  min-height: 100vh;
}
/* ensure scene wrapper stretches */
.scene-fill > * {
  position: absolute !important;
  inset: 0px !important;
  width: 100% !important;
  height: 100% !important;
}
</style>
