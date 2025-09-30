<template>
  <teleport to="body">
    <div class="app-toast-container">
      <transition-group
        name="app-toast"
        tag="div"
      >
        <v-snackbar
          v-for="toast in toasts"
          :key="toast.id"
          :model-value="isVisible(toast.id)"
          :timeout="toast.timeout"
          :color="toast.color"
          variant="elevated"
          location="bottom"
          multi-line
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
</style>
