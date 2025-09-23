import { createApp } from "vue";
import App from "./App.vue";

import router from "@/router/index.js";
import { createPinia } from "pinia";
import vuetify from "@/vuetify";
import { profiler } from "@/utils/profiler";
import { useUserStore } from '@/stores/userStore';

// Startup timing bootstrap
if (typeof window !== "undefined") {
  if (!window.__DAEMIOS_STARTUP) {
    window.__DAEMIOS_STARTUP = {
      t0:
        typeof performance !== "undefined" && performance.now
          ? performance.now()
          : Date.now(),
      firstFrame: false,
      firstContent: false,
    };
  }
}

const app = createApp(App);

app.use(router).use(createPinia()).use(vuetify);

// Bootstrap user state (active character + inventory) once on mount
app.mount("#app");
try {
  const userStore = useUserStore();
  // fire-and-forget; the api util will redirect to login on 401
  userStore.bootstrapOnMount();
} catch (e) {
  /* ignore bootstrap errors */
}

// Record router readiness and app mount relative to boot
try {
  const now =
    typeof performance !== "undefined" && performance.now
      ? performance.now()
      : Date.now();
  const t0 =
    typeof window !== "undefined" &&
    window.__DAEMIOS_STARTUP &&
    window.__DAEMIOS_STARTUP.t0
      ? window.__DAEMIOS_STARTUP.t0
      : now;
  profiler.push("startup.app.mounted", now - t0);
} catch (e) {
  /* ignore startup profiler errors */
}

try {
  router
    .isReady()
    .then(() => {
      const now =
        typeof performance !== "undefined" && performance.now
          ? performance.now()
          : Date.now();
      const t0 =
        typeof window !== "undefined" &&
        window.__DAEMIOS_STARTUP &&
        window.__DAEMIOS_STARTUP.t0
          ? window.__DAEMIOS_STARTUP.t0
          : now;
      profiler.push("startup.router.ready", now - t0);
    })
    .catch(() => {
      /* ignore router readiness errors */
    });
} catch (e) {
  /* ignore global startup errors */
}
