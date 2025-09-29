<template>
  <teleport to="body">
    <div class="app-toast-container">
      <transition-group name="app-toast" tag="div">
        <v-snackbar
          v-for="toast in toasts"
          :key="toast.id"
          :model-value="isVisible(toast.id)"
          :timeout="toast.timeout"
          :color="toast.color"
          variant="elevated"
          location="bottom"
          multi-line
          class="fantasy-toast"
          @update:modelValue="(value) => handleVisibilityChange(toast.id, value)"
        >
          <div class="d-flex align-center justify-space-between w-100">
            <span class="mr-4">{{ toast.message }}</span>
            <v-btn
              v-if="toast.dismissible !== false"
              icon="mdi-close"
              variant="text"
              size="small"
              @click="handleVisibilityChange(toast.id, false)"
            />
          </div>
        </v-snackbar>
      </transition-group>
    </div>
  </teleport>
</template>

<script setup>
import { computed, reactive, watch } from "vue";
import { useToastStore } from "@/stores/toastStore";

const toastStore = useToastStore();
const toasts = computed(() => toastStore.toasts);
const visibility = reactive({});

watch(
  toasts,
  (current) => {
    current.forEach((toast) => {
      if (visibility[toast.id] == null) {
        visibility[toast.id] = true;
      }
    });
  },
  { immediate: true }
);

function isVisible(id) {
  if (visibility[id] == null) visibility[id] = true;
  return visibility[id];
}

function handleVisibilityChange(id, value) {
  visibility[id] = value;
  if (value === false) {
    toastStore.dismiss(id);
    delete visibility[id];
  }
}
</script>

<style scoped>
.app-toast-container {
  position: fixed;
  bottom: 16px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  pointer-events: none;
  z-index: 1000;
}

.app-toast-enter-active,
.app-toast-leave-active {
  transition: all 0.2s ease;
}

.app-toast-enter-from,
.app-toast-leave-to {
  opacity: 0;
  transform: translateY(16px);
}

.app-toast-container :deep(.v-snackbar) {
  pointer-events: all;
}

.app-toast-container :deep(.fantasy-toast .v-overlay__content) {
  transform-origin: bottom center;
}

.app-toast-container :deep(.fantasy-toast .v-snackbar__wrapper) {
  background: linear-gradient(135deg, rgba(23, 13, 42, 0.92), rgba(48, 23, 82, 0.96));
  border: 1px solid rgba(233, 198, 120, 0.35);
  box-shadow: 0 22px 40px rgba(6, 0, 18, 0.65), inset 0 0 20px rgba(243, 210, 106, 0.12);
  backdrop-filter: blur(14px);
  color: var(--fantasy-text);
  font-family: "Spectral", serif;
  letter-spacing: 0.05em;
}

.app-toast-container :deep(.fantasy-toast .v-btn) {
  color: var(--fantasy-highlight) !important;
}
</style>
