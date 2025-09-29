import { defineStore } from "pinia";

let nextId = 1;

function normalizeOptions(message, options = {}) {
  if (!message) {
    return null;
  }
  return {
    id: nextId++,
    message: String(message),
    color: options.color || "error",
    timeout: typeof options.timeout === "number" ? options.timeout : 6000,
    dismissible: options.dismissible !== false,
  };
}

export const useToastStore = defineStore("toast", {
  state: () => ({
    toasts: [],
  }),
  actions: {
    push(message, options = {}) {
      const toast = normalizeOptions(message, options);
      if (!toast) return null;
      this.toasts.push(toast);
      return toast.id;
    },
    showError(message, options = {}) {
      return this.push(message, { ...options, color: options.color || "error" });
    },
    dismiss(id) {
      if (id == null) return;
      this.toasts = this.toasts.filter((toast) => toast.id !== id);
    },
    clear() {
      this.toasts = [];
    },
  },
});
