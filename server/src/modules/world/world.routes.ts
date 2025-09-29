import { Router } from 'express';
import locations from './locations.routes';
import towns from './towns.routes';
import dungeons from './dungeons.routes';
import { respondError, respondSuccess } from '../../utils/apiResponse';

const router = Router();

router.get('/seed', (req, res) => {
  if (res.app.locals.world && res.app.locals.world.seed) {
    respondSuccess(res, 200, { seed: res.app.locals.world.seed });
    return;
  }

  respondError(res, 404, 'not_found', 'World seed not set');
});

router.post('/move', (_req, res) => respondSuccess(res, 200, { moved: true }));

router.use('/locations', locations);
router.use('/towns', towns);
router.use('/dungeons', dungeons);

export default router;
