// create a store named ability
import api from "@/functions/api";

export default {
  namespaced: true,
  state: {
    elements: null,
    ranges: null,
    types: null,
    shapes: null,
  },
  mutations: {
    setElements(state, elements) {
      state.elements = elements;
    }
  },
  actions: {
    getElements(context) {
      api.get('ability/elements').then(response => {
        context.commit('setElements', response);
      });
    }
  }
}
