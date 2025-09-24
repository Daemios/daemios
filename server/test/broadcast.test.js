import assert from 'node:assert/strict';
import { WebSocket } from 'ws';
import wss from '../src/lib/socket.js';

const messages = [];
const openClient = { readyState: WebSocket.OPEN, send: message => messages.push(message) };
const closedClient = { readyState: WebSocket.CLOSED, send: () => {
  throw new Error('send should not be called on closed client');
} };

const clients = wss.clients;
clients.add(openClient);
clients.add(closedClient);

try {
  const payload = { hello: 'world' };
  wss.send('TEST', payload);
  assert.deepEqual(messages, [JSON.stringify({ type: 'TEST', body: payload })]);
} finally {
  clients.clear();
  await new Promise((resolve, reject) => {
    wss.close(err => (err ? reject(err) : resolve()));
  });
}
