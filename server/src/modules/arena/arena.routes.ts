import { Router } from 'express';
import * as controller from './arena.controller';
import { respondError, respondSuccess } from '../../utils/apiResponse';

const router = Router();

router.post('/move', (_req, res) => {
  // Movement validation was legacy; stubbed to return false/accepted false for now
  respondSuccess(res, 200, false);
});

router.get('/terrain', (req, res) => {
  if (req.app && req.app.locals && req.app.locals.arena && req.app.locals.arena.seed) {
    respondSuccess(res, 200, { seed: req.app.locals.arena.seed });
    return;
  }

  respondError(res, 404, 'not_found', 'Arena seed not set');
});

router.get('/list', controller.list);
router.get('/single/:id', controller.single);
router.delete('/single/:id', controller.remove);
router.post('/load/:id', controller.load);
router.post('/create', controller.create);

export default router;
