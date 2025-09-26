import { Router } from 'express';
import { getRaces } from './data.controller';

const router = Router();

router.get('/races', getRaces);

export default router;
