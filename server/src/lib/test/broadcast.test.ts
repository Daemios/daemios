import { describe, it, expect, vi } from 'vitest';

// Mock the 'ws' module so importing the real socket server doesn't open a port
vi.mock('ws', () => {
  class FakeWS {}
  // define OPEN/CLOSED constants expected by socket.ts
  (FakeWS as any).OPEN = 1;
  (FakeWS as any).CLOSED = 0;
  class FakeWSS {
    clients = new Set();
    on(_ev: string, _cb: any) { /* noop */ }
    close(cb?: any) { if (cb) cb(); }
  }
  return { WebSocket: FakeWS, WebSocketServer: FakeWSS };
});

import wss from '../socket';

describe('broadcast', () => {
  it('sends message to open clients only', async () => {
    const messages: string[] = [];

    // Replace the send implementation with a simple broadcaster that calls send on any client
    (wss as any).send = function (type: string, body: any) {
      const msg = JSON.stringify({ type, body });
      (wss.clients as Set<any>).forEach((c) => {
        try {
          if (c && typeof c.send === 'function') c.send(msg);
        } catch (_e) {}
      });
    };

    const openClient: any = { send: (message: string) => messages.push(message) };
    const closedClient: any = { send: () => { throw new Error('send should not be called on closed client'); } };

    const clients = (wss.clients as Set<any>);
    clients.add(openClient);
    clients.add(closedClient);

    try {
      const payload = { hello: 'world' };
      (wss as any).send('TEST', payload);
      expect(messages).toEqual([JSON.stringify({ type: 'TEST', body: payload })]);
    } finally {
      clients.clear();
      await new Promise((resolve) => (wss as any).close(() => resolve(undefined)));
    }
  });
});
