<template>
  <div
    class="container-cell"
    :class="{ highlighted: highlighted }"
    @dragover.prevent
    @drop="onDrop"
    @mouseenter="$emit('mouseenter')"
    @mouseleave="$emit('mouseleave')"
  >
    <div class="container-icon">
      <v-icon>{{ mdiWizardHat }}</v-icon>
    </div>
    <div class="container-name">
      {{ container.name }} ({{ container.capacity }})
    </div>
  </div>
</template>

<script setup>
import { defineEmits, defineProps } from "vue";
import { mdiWizardHat } from "@mdi/js";

const props = defineProps({
  container: { type: Object, required: true },
  highlighted: { type: Boolean, default: false },
});

const emit = defineEmits(["replace-container", "mouseenter", "mouseleave"]);

function onDrop(e) {
  try {
    const raw = e.dataTransfer.getData("application/json");
    if (!raw) return;
    const payload = JSON.parse(raw);
    // Expect payload.type === 'container' or payload.type === 'item' that can replace
    emit("replace-container", {
      targetContainerId: props.container.id,
      payload,
    });
  } catch (err) {
    console.warn("container drop parse failed", err);
  }
}
</script>

<style scoped>
.container-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 6px;
}
.container-cell.highlighted {
  outline: 2px solid rgba(33, 150, 243, 0.5);
}
.container-icon v-icon {
  font-size: 20px;
}
.container-name {
  font-size: 0.85rem;
}
</style>
