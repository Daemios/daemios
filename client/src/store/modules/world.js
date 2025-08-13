import Vue from 'vue';
import api from "@/functions/api";
const cartesian = require('../../mixins/cartesian')

export default {
  namespaced: true,
  state: {
    terrain: null,
  },
  mutations: {
    setTerrain(state, terrain) {
      state.terrain = terrain;
    },
  },
  actions: {
    getTerrain(context) {
      api.get('world/terrain')
        .then(response => {
          context.commit('setTerrain', response)
        })
    }
  }
}
