import { Router } from 'express';
import wss from '../../lib/socket';
import Encounter from './encounter';
import { respondSuccess } from '../../utils/apiResponse';

const router = Router();

router.post('/combat/start', async (req, res) => {
  const encounter = new Encounter();
  req.session.encounter = encounter;
  wss.send('combat_start', encounter);
  respondSuccess(res, 200, { encounter });
});

router.post('/combat/end', async (req, res) => {
  const encounter = req.session.encounter as Encounter | null;
  if (encounter instanceof Encounter) {
    encounter.end();
  }
  wss.send('combat_end', encounter);
  req.session.encounter = null;
  respondSuccess(res, 200, { encounterEnded: true });
});

export default router;
