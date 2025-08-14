import { mdiVolumeSource, mdiVolumeMute } from '@mdi/js';
import { useAudioStore } from '@/stores/audioStore';

export default {
  data: () => ({
    mdiVolumeSource,
    mdiVolumeMute,
  }),
  computed: {
    volume() {
      return useAudioStore().volume;
    },
    volumeIcon() {
      return this.volume > 0 ? mdiVolumeSource : mdiVolumeMute;
    },
  },
};
