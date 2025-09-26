import express from 'express';
import { index, show, create } from '../../modules/world/dungeons.controller';

const router = express.Router();

router.get('/', index);
router.post('/', create);
router.get('/:id', show);

export default router;
