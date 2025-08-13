export default {
  namespaced: true,
  state: {
    connection: false,
  },
  mutations: {
    setConnection(state, status) {
      console.log('socket status: ' + status)
      state.connection = status;
    }
  }
}
