export default {
  namespaced: true,
  state: {
    socket: null,
  },
  actions: {
    connect() {

    },
    send(context, payload) {
      this.socket.send(payload)
    }
  }
}
