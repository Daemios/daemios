import express from 'express';
import {
  index, create, show, destroy,
} from '../../controllers/worldLocationController.js';

const router = express.Router();

router.get('/', index);
router.post('/', create);
router.get('/:id', show);
router.delete('/:id', destroy);

export default router;
