import { Router } from 'express';
import { postEquip, postUnequip, getList } from './characterEquip.controller';
const router = Router();
router.post('/equip', postEquip);
router.post('/unequip', postUnequip);
router.get('/', getList);
export default router;
