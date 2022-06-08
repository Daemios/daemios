import Vue from 'vue';
import Vuetify from 'vuetify/lib/framework';
import themes from '@/vuetify/themes';

Vue.use(Vuetify);

const vuetify = new Vuetify({
  theme: themes,
  icons: {
    iconfont: 'mdiSvg',
  },
});

export default vuetify;
