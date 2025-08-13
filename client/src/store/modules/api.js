export default {
  namespaced: true,
  state: {
    endpoint: 'http://localhost:3000',
    calling: false,
  },
  mutations: {
    setCalling(state, status) {
      state.calling = status;
    },
  },
};
