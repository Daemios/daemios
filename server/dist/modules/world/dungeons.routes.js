import { Router } from 'express';
import { index, show, create } from '../../controllers/dungeonController';
const router = Router();
router.get('/', index);
router.post('/', create);
router.get('/:id', show);
export default router;
