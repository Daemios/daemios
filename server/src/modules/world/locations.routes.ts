import { Router } from 'express';
import { index, create, show, destroy } from './locations.controller';

const router = Router();

router.get('/', index);
router.post('/', create);
router.get('/:id', show);
router.delete('/:id', destroy);

export default router;
