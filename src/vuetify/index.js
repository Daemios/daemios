import Vue from 'vue';
import Vuetify from 'vuetify/lib/framework';

Vue.use(Vuetify);

const vuetify = new Vuetify({
  theme: { dark: true },
  icons: {
    iconfont: 'mdiSvg',
  },
});

export default vuetify;
