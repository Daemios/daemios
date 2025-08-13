export default {
  namespaced: true,
  state: {
    volume: 100,
    previous_volume: 0,
  },
  mutations: {
    toggleMute(state) {
      if (state.volume === 0) {
        state.volume = state.previous_volume;
      } else {
        state.previous_volume = state.volume;
        state.volume = 0;
      }
    },
  },
};
