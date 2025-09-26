import { Router } from 'express';
import * as controller from './arena.controller';

const router = Router();

router.post('/move', (req, res) => {
  // Movement validation was legacy; stubbed to return false/accepted false for now
  res.send(false);
});

router.get('/terrain', (req, res) => {
  if (req.app && req.app.locals && req.app.locals.arena && req.app.locals.arena.seed) {
    res.json({ seed: req.app.locals.arena.seed });
  } else {
    res.status(404).send('arena seed not set');
  }
});

router.get('/list', controller.list);
router.get('/single/:id', controller.single);
router.delete('/single/:id', controller.remove);
router.post('/load/:id', controller.load);
router.post('/create', controller.create);

export default router;
