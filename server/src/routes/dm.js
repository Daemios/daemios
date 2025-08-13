import express from 'express';
import wss from '../lib/socket.js';
import Encounter from '../lib/encounter.js';

const router = express.Router();

// TODO completely rework this
router.post('/combat/start', async (req, res) => {
  const encounter = new Encounter();
  req.session.encounter = encounter;
  wss.send('combat_start', encounter);
  res.sendStatus(200);
});

router.post('/combat/end', async (req, res) => {
  const encounter = req.session.encounter;
  if (encounter instanceof Encounter) {
    encounter.end();
  }
  wss.send('combat_end', encounter);
  req.session.encounter = null;
  res.sendStatus(200);
});

export default router;
