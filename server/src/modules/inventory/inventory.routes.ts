import { Router } from 'express';
import { getInventory, postMove, postAction } from './inventory.controller';

const router = Router();

router.get('/', getInventory);
router.post('/move', postMove);
router.post('/action', postAction);

export default router;
