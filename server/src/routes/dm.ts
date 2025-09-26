import express, { Request, Response } from 'express';
import wss from '../lib/socket';
import Encounter from '../modules/dm/encounter';

const router = express.Router();

router.post('/combat/start', async (req: Request, res: Response) => {
  const encounter = new Encounter();
  // @ts-ignore - session typing is incremental
  req.session.encounter = encounter;
  // typed broadcast
  wss.send('combat_start', encounter);
  res.sendStatus(200);
});

router.post('/combat/end', async (req: Request, res: Response) => {
  // @ts-ignore
  const encounter = req.session.encounter as Encounter | null;
  if (encounter instanceof Encounter) {
    encounter.end();
  }
  wss.send('combat_end', encounter);
  // @ts-ignore
  req.session.encounter = null;
  res.sendStatus(200);
});

export default router;

