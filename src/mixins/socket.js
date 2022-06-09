export default {
  data: () => ({
    socket: null,
  }),
  methods: {
    movement(data) {

    },
    chat() {

    },
  },
  created() {
    this.socket = new WebSocket("ws://localhost:3001/")
    this.socket.onopen = () => {
      this.$store.commit('socket/setConnection', true)
    }
    this.socket.onclose = () => {
      this.$store.commit('socket/setConnection', false)
    }
    this.socket.onmessage = (event) => {
      let data;
      if (event.data) {
        data = JSON.parse(event.data)
      }
      switch (data.type) {
        case 'movement':
          this.movement(data);
          break;
        case 'chat':
          this.chat(data);
          break;
        default:
          break;
      }
    }
  }
}
