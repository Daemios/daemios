import assert from 'node:assert/strict';
import { WebSocket } from 'ws';
import wss from '../socket';

(async () => {
  const messages: string[] = [];
  const openClient: any = { readyState: WebSocket.OPEN, send: (message: string) => messages.push(message) };
  const closedClient: any = { readyState: WebSocket.CLOSED, send: () => { throw new Error('send should not be called on closed client'); } };

  const clients = (wss.clients as Set<WebSocket>);
  clients.add(openClient as unknown as WebSocket);
  clients.add(closedClient as unknown as WebSocket);

  try {
    const payload = { hello: 'world' };
    wss.send('TEST', payload);
    assert.deepEqual(messages, [JSON.stringify({ type: 'TEST', body: payload })]);
  } finally {
    clients.clear();
    await new Promise((resolve, reject) => {
      // ws server close has optional callback
      (wss as any).close((err: any) => (err ? reject(err) : resolve(undefined)));
    });
  }
})();
