import Vue from 'vue';
import App from './App.vue';

import router from '@/router';
import store from '@/store';
import vuetify from '@/vuetify';

// The setup call will assign things to the session such as organization
// info and permission information. Once the data is retrieved on setup
// then the application will mount
new Vue({
  router,
  store,
  vuetify,
  render: (h) => h(App),
}).$mount('#app');

