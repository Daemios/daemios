import { mapState } from 'vuex';
import { mdiSkull, mdiShield } from '@mdi/js';

export default {
  data: () => ({
    mdiSkull,
    mdiShield,
  }),
  computed: {
    ...mapState({
    }),
  },
  methods: {
    isDangerousIcon(loc) {
      return loc.dangerous ? mdiSkull : mdiShield;
    },
    isDangerousText(loc) {
      return loc.dangerous ? 'red--text' : 'green--text';
    },
  },
};
