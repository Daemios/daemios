import { useSocketStore } from "@/stores/socketStore";
import { useChatStore } from "@/stores/chatStore";

export default {
  data: () => ({ socket: null }),
  methods: {
    connect() {
      const socketStore = useSocketStore();
      const chatStore = useChatStore();
      this.socket = new WebSocket("ws://localhost:3001/");
      this.socket.onopen = () => {
        socketStore.setConnection(true);
      };
      this.socket.onclose = () => {
        socketStore.setConnection(false);
        setTimeout(this.connect, 1000);
      };
      this.socket.onmessage = (event) => {
        let data;
        if (event.data) data = JSON.parse(event.data);
        switch (data?.type) {
          case "chat":
            if (data.body) {
              const message = data.body.message || data.body;
              if (message) chatStore.ADD_MESSAGE(message);
            }
            break;
          default:
            // eslint-disable-next-line no-console
            console.log(data);
            break;
        }
      };
    },
  },
  created() {
    this.connect();
  },
};
