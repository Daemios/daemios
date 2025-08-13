import { mdiSkull, mdiShield } from '@mdi/js';

export default {
  data: () => ({
    mdiSkull,
    mdiShield,
  }),
  computed: {},
  methods: {
    isDangerousIcon(loc) {
      return loc.dangerous ? mdiSkull : mdiShield;
    },
    isDangerousText(loc) {
      return loc.dangerous ? 'red--text' : 'green--text';
    },
  },
};
