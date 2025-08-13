import 'vuetify/styles';
import { createVuetify } from 'vuetify';
import { aliases, mdi } from 'vuetify/iconsets/mdi-svg';
import themes from '@/vuetify/themes';

export default createVuetify({
  theme: themes,
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: { mdi },
  },
});
