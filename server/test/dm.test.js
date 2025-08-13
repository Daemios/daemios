import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import router from '../src/routes/dm.js';
import Encounter from '../src/lib/encounter.js';
import wss from '../src/lib/socket.js';

// silence socket broadcasts during tests
wss.send = () => {};

after(() => {
  wss.close();
});

function getHandler(path) {
  const layer = router.stack.find((l) => l.route && l.route.path === path);
  return layer.route.stack[0].handle;
}

test('start encounter initializes session', async () => {
  const handler = getHandler('/combat/start');
  const req = { session: {} };
  let status;
  const res = { sendStatus: (code) => { status = code; } };

  await handler(req, res);
  assert.equal(status, 200);
  assert.ok(req.session.encounter instanceof Encounter);
  assert.equal(req.session.encounter.isActive, true);
});

test('end encounter clears session', async () => {
  const handler = getHandler('/combat/end');
  const encounter = new Encounter();
  const req = { session: { encounter } };
  let status;
  const res = { sendStatus: (code) => { status = code; } };

  await handler(req, res);
  assert.equal(status, 200);
  assert.equal(req.session.encounter, null);
});
