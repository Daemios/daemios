import express from 'express';
import { index, create, show, destroy } from '../../modules/world/locations.controller';

const router = express.Router();

router.get('/', index);
router.post('/', create);
router.get('/:id', show);
router.delete('/:id', destroy);

export default router;
