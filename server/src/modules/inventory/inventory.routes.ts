import { Router } from 'express';
import { getInventory, postMove } from './inventory.controller';

const router = Router();

router.get('/', getInventory);
router.post('/move', postMove);

export default router;
