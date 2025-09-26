import { Router } from 'express';
import { postCreate, getList, getOne, putUpdate, delOne } from './ability.controller';

const router = Router();

router.post('/', postCreate);
router.get('/', getList);
router.get('/:id', getOne);
router.put('/:id', putUpdate);
router.delete('/:id', delOne);

export default router;
