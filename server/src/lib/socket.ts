import { WebSocket as WS, WebSocketServer } from 'ws';

export interface Broadcastable {
  send(type: string, body: any): void;
}

// Allow test runners to allocate distinct ports per worker to avoid EADDRINUSE
const basePort = process.env.SOCKET_PORT ? Number(process.env.SOCKET_PORT) : 3001;
const workerId = process.env.VITEST_WORKER_ID || process.env.JEST_WORKER_ID;
const port = workerId ? basePort + Number(workerId) : basePort;

const wss = new WebSocketServer({ port }) as WebSocketServer & Broadcastable;

console.log('starting socket server on port', port);

wss.on('connection', (socket: WS) => {
  socket.on('message', (data: any) => {
    console.log('received: %s', data);
  });
});

// Implement a typed broadcast method on the server instance.
// Keep the legacy behavior of swallowing send errors but avoid unsafe any casts.
(wss as Broadcastable).send = function broadcast(type: string, body: any) {
  const message = JSON.stringify({ type, body });
  wss.clients.forEach((client) => {
    try {
      if (client && (client as WS).readyState === WS.OPEN) {
        (client as WS).send(message);
      }
    } catch (e) {
      // swallow send errors per legacy behavior
    }
  });
};

export default wss;
 
