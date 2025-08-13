import { WebSocket, WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 3001 });

console.log('starting socket server');

wss.on('connection', (socket) => {
  socket.on('message', (data) => {
    console.log('received: %s', data);
  });
});

wss.send = function broadcast(type, body) {
  const message = JSON.stringify({ type, body });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
};

export default wss;
