import { createApp } from 'vue';
import App from './App.vue';

import router from '@/router/index.js';
import pinia from '@/store';
import vuetify from '@/vuetify';
import { profiler } from '@/utils/profiler';

// Startup timing bootstrap
if (typeof window !== 'undefined') {
  if (!window.__DAEMIOS_STARTUP) {
    window.__DAEMIOS_STARTUP = {
      t0: (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now(),
      firstFrame: false,
      firstContent: false,
    };
  }
}

const app = createApp(App);

app
  .use(router)
  .use(pinia)
  .use(vuetify);

app.mount('#app');

// Record router readiness and app mount relative to boot
try {
  const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  const t0 = (typeof window !== 'undefined' && window.__DAEMIOS_STARTUP && window.__DAEMIOS_STARTUP.t0) ? window.__DAEMIOS_STARTUP.t0 : now;
  profiler.push('startup.app.mounted', now - t0);
} catch (e) {}

try {
  router.isReady().then(() => {
    const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    const t0 = (typeof window !== 'undefined' && window.__DAEMIOS_STARTUP && window.__DAEMIOS_STARTUP.t0) ? window.__DAEMIOS_STARTUP.t0 : now;
    profiler.push('startup.router.ready', now - t0);
  }).catch(() => {});
} catch (e) {}

