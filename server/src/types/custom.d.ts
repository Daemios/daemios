declare module '../../lib/socket' {
  import WebSocketServer from 'ws'
  const value: WebSocketServer & import('ws').Broadcastable
  export default value
}

declare module '../../lib/encounter' {
  const Encounter: any;
  export default Encounter;
}

// Project-root imports
declare module 'src/lib/socket' {
  import WebSocketServer from 'ws'
  const value: WebSocketServer & import('ws').Broadcastable
  export default value
}

declare module 'src/lib/encounter' {
  const Encounter: any;
  export default Encounter;
}
