import { createApp } from 'vue';
import App from './App.vue';

import router from '@/router';
import store from '@/store';
import vuetify from '@/vuetify';

const app = createApp(App);
// enable Vue 2 compatibility mode
app.config.compatConfig = { MODE: 2 };

app
  .use(router)
  .use(store)
  .use(vuetify)
  .mount('#app');

