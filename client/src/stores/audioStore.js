import { defineStore } from "pinia";

export const useAudioStore = defineStore("audio", {
  state: () => ({
    volume: 100,
    music: 100,
    previous_volume: 0,
  }),
  getters: {
    isMuted: (state) => state.volume === 0,
    // returns a 0.0-1.0 multiplier for music playback
    musicFraction: (state) => (state.volume / 100) * (state.music / 100),
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
    setVolume(v) {
      this.volume = Math.max(0, Math.min(100, Number(v) || 0));
    },
    setMusic(v) {
      this.music = Math.max(0, Math.min(100, Number(v) || 0));
    },
  },
});
