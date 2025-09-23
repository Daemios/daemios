<template>
  <v-btn
    class="shape-button ma-2"
    @click="emitSelect"
  >
    <div class="shape-container d-flex align-center justify-center">
      <AbilityMockup
        :height="shape.h"
        :width="shape.w"
        :block-size="shape.blockSize || 6"
        :key_prefix="shape.id"
      />
      <div class="overlay-icon d-flex align-center justify-center">
        <VesselMini
          :color="elementColor"
          :small="true"
        />
      </div>
    </div>
  </v-btn>
</template>

<script setup>
import AbilityMockup from "@/components/ability/AbilityMockup.vue";
import VesselMini from "@/components/ability/VesselMini.vue";

const props = defineProps({
  shape: { type: Object, required: true },
  elementColor: { type: String, required: true },
});
const emit = defineEmits(["select"]);

function emitSelect() {
  emit("select", props.shape);
}
</script>

<style>
.shape-button {
  min-width: 48px;
  min-height: 48px;
  padding: 4px;
}
.shape-container {
  position: relative;
}
.shape-container .overlay-icon {
  position: absolute;
  right: -6px;
  bottom: -6px;
  width: 20px;
  height: 20px;
}
</style>
