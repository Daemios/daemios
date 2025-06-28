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
        console.log(data)
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
          case 'combat_start':
            this.combatStart(data);
            console.log(data)
            break;
          case 'combat_end':
            this.combatEnd(data);
            console.log(data)
            break;
          default:
            console.log(data)
            break;
        }
      }
    },
    movement(data) {
      if (data && data.body) {
        if (data.body.entities) {
          this.$store.commit('arena/setEntities', data.body.entities);
        }
        if (data.body.active) {
          this.$store.commit('arena/setActive', data.body.active);
        }
      }
    },
    chat(data) {
      if (data && data.body) {
        const message = data.body.message || data.body;
        if (message) {
          this.$store.commit('chat/ADD_MESSAGE', message);
        }
      }
    },
    arena(data) {
      this.$store.commit('arena/setTerrain', data.body.terrain)
    },
    combatStart(data) {
      //this.$store.dispatch('arena/setCombat', data.body.combat)
      this.$store.commit('arena/setCombat', true)
    },
    combatEnd(data) {
      this.$store.commit('arena/setCombat', false)
    }
  },
  created() {
    this.connect();
  }
}
