import express from 'express';
import wss from '../lib/socket.js';
import locations from './world/locations.js';
import towns from './world/towns.js';
import dungeons from './world/dungeons.js';

const router = express.Router();

router.get('/seed', (req, res) => {
  try {
    if (res.app.locals.world && res.app.locals.world.seed) {
      res.json({ seed: res.app.locals.world.seed });
    } else {
      res.status(404).send('world seed not set');
    }
  } catch (e) {
    console.error(e);
    res.status(500).send('Server Error');
  }
});

// Always returns success: true
router.post('/move', (req, res) => {
  res.json({ success: true });
});

// MVC subroutes
router.use('/locations', locations);
router.use('/towns', towns);
router.use('/dungeons', dungeons);

export default router;
