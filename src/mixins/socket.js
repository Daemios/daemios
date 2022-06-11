export default {
  data: () => ({
    socket: null,
  }),
  methods: {
    connect() {
      this.socket = new WebSocket("ws://localhost:3001/")
      this.socket.onopen = () => {
        this.$store.commit('socket/setConnection', true)
      }
      this.socket.onclose = () => {
        this.$store.commit('socket/setConnection', false)
        setTimeout(this.connect,1000)
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
          case 'arena':
            this.arena(data);
            break;
          default:
            break;
        }
      }
    },
    movement(data) {

    },
    chat(data) {

    },
    arena(data) {
      this.$store.dispatch('arena/setTerrain', data.body.terrain)
    }
  },
  created() {
    this.connect();
  }
}
