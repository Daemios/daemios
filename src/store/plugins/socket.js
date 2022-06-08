let socket = new WebSocket("ws://localhost:3001/")
socket.onmessage = function (event) {
  console.log(event);
}
setTimeout(() => {
  this.socket.send('test from client')
}, 5000)

export default function createWebSocketPlugin() {
  return store => {
    socket.onmessage(message => {
      // can use this for chat later, but this is just listening
      // and has access to store
      //store.dispatch('chat/addMessage', message);
    });

    store.subscribe((mutation, state) => {
      if (mutation.type === 'arena/moveEntity') {}
      // this just listens to mutations and does the callback if thats the
      // correct path
    });
  }
}
