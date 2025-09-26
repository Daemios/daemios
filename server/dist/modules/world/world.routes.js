import { Router } from 'express';
import locations from './locations.routes';
import towns from './towns.routes';
import dungeons from './dungeons.routes';
const router = Router();
router.get('/seed', (req, res) => {
    if (res.app.locals.world && res.app.locals.world.seed) {
        res.json({ seed: res.app.locals.world.seed });
    }
    else {
        res.status(404).send('world seed not set');
    }
});
router.post('/move', (_req, res) => res.json({ success: true }));
router.use('/locations', locations);
router.use('/towns', towns);
router.use('/dungeons', dungeons);
export default router;
