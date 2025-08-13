import express from 'express';
import { index, show, create } from '../../controllers/dungeonController.js';

const router = express.Router();

router.get('/', index);
router.post('/', create);
router.get('/:id', show);

export default router;
