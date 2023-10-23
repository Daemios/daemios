import api from "@/functions/api";

export default {
  namespaced: true,
  state: {
    races: null,
  },
  mutations: {
    setRaces(state, races) {
      state.races = races;
    }
  },
  actions: {
    getRaces(context) {
      api.get('creature_data/races').then(response => {
        context.commit('setRaces', response.races);
      })
    }
  }
}