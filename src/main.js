import { createApp } from 'vue';
import App from './App.vue';

import router from '@/router/index.js';
import pinia from '@/store';
import vuetify from '@/vuetify';

const app = createApp(App);

app
  .use(router)
  .use(pinia)
  .use(vuetify);


app.mount('#app');

