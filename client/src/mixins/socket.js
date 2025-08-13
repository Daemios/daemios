import { useSocketStore } from '@/stores/socketStore';
import { useChatStore } from '@/stores/chatStore';
import { useArenaStore } from '@/stores/arenaStore';

export default {
  data: () => ({ socket: null }),
  methods: {
    connect() {
      const socketStore = useSocketStore();
      const chatStore = useChatStore();
      const arenaStore = useArenaStore();
      this.socket = new WebSocket('ws://localhost:3001/');
      this.socket.onopen = () => { socketStore.setConnection(true); };
      this.socket.onclose = () => {
        socketStore.setConnection(false);
        setTimeout(this.connect, 1000);
      };
      this.socket.onmessage = (event) => {
        let data;
        if (event.data) data = JSON.parse(event.data);
        switch (data?.type) {
          case 'movement':
            if (data.body?.entities) arenaStore.setEntities(data.body.entities);
            if (data.body?.active) arenaStore.setActive(data.body.active);
            break;
          case 'chat':
            if (data.body) {
              const message = data.body.message || data.body;
              if (message) chatStore.ADD_MESSAGE(message);
            }
            break;
          case 'arena':
            if (data.body?.terrain) arenaStore.setTerrain(data.body.terrain);
            break;
          case 'combat_start':
            arenaStore.setCombat(true);
            break;
          case 'combat_end':
            arenaStore.setCombat(false);
            break;
          default:
            // eslint-disable-next-line no-console
            console.log(data);
            break;
        }
      };
    },
  },
  created() { this.connect(); },
};
