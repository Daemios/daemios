import { WebSocket } from 'ws';
import wss from '../src/lib/socket.js';

async function runTest() {
  // wait for client connection
  const client = new WebSocket('ws://localhost:3001');
  await new Promise((resolve, reject) => {
    client.on('open', resolve);
    client.on('error', reject);
  });

  const messageData = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timeout waiting for message')), 1000);
    client.on('message', (data) => {
      clearTimeout(timer);
      resolve(data.toString());
    });
    client.on('error', reject);
    wss.send('test', 'hello');
  });

  client.close();
  await new Promise((res) => client.on('close', res));
  wss.close();

  const { type, body } = JSON.parse(messageData);
  if (type !== 'test' || body !== 'hello') {
    throw new Error('Broadcast message mismatch');
  }
  console.log('Broadcast test passed');
}

runTest().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
