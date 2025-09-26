declare module 'ws' {
  export class WebSocket {
    static OPEN: number;
    static CLOSED: number;
    readyState: number;
    send(data: any): void;
    on(event: string, handler: (...args: any[]) => void): void;
  }

  export interface WebSocketServer {
    clients: Set<WebSocket>;
    on(event: 'connection' | string, handler: (...args: any[]) => void): void;
  }

  export interface Broadcastable {
    send(type: string, body: any): void;
  }

  export const WebSocketServer: {
    new (opts?: any): WebSocketServer & Broadcastable;
  };

  export default WebSocketServer;
}
