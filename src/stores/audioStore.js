import { defineStore } from 'pinia';

export const useAudioStore = defineStore('audio', {
  state: () => ({
    volume: 100,
    previous_volume: 0,
  }),
  getters: {
    isMuted: (state) => state.volume === 0,
  },
  actions: {
    toggleMute() {
      if (this.volume === 0) {
        this.volume = this.previous_volume;
      } else {
        this.previous_volume = this.volume;
        this.volume = 0;
      }
    },
  },
});
