import { mapState } from 'vuex';
import { mdiVolumeSource, mdiVolumeMute } from '@mdi/js';

export default {
  data: () => ({
    mdiVolumeSource,
    mdiVolumeMute,
  }),
  computed: {
    ...mapState({
      volume: (state) => state.audio.volume,
    }),
    volumeIcon() {
      return this.volume > 0 ? mdiVolumeSource : mdiVolumeMute;
    },
  },
};
