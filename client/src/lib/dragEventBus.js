// Minimal event bus for drag/drop events (no external deps)
const listeners = new Map();

export default {
  on(event, fn) {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(fn);
  },
  off(event, fn) {
    if (!listeners.has(event)) return;
    listeners.get(event).delete(fn);
    if (listeners.get(event).size === 0) listeners.delete(event);
  },
  emit(event, payload) {
    if (!listeners.has(event)) return;
    for (const fn of Array.from(listeners.get(event))) {
      try {
        fn(payload);
      } catch (err) {
        console.error("dragEventBus listener error", err);
      }
    }
  },
};
