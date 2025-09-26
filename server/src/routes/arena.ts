import express from 'express';
import crypto from 'crypto';
import wss from '../lib/socket';
import { prisma } from '../db/prisma';

const router = express.Router();

router.post('/move', async (req, res) => {
  try {
    let accepted = false;
    console.log('validating movement');
    if (true) {
      accepted = true;
    }
    res.send(accepted);
    wss.send('movement', 'test');
  } catch (e) {
    console.log(e);
    res.status(500).send('Server Error');
  }
});

router.get('/terrain', (req, res) => {
  try {
    if (res.app.locals.arena && res.app.locals.arena.seed) {
      res.json({ seed: res.app.locals.arena.seed });
    } else {
      res.status(404).send('arena seed not set');
    }
  } catch (e) {
    console.log(e);
    res.status(500).send('Server Error');
  }
});

router.get('/list', async (req, res) => {
  try {
    const arenas = await prisma.arenaHistory.findMany({
      orderBy: { created_on: 'desc' },
      take: 10,
    });

    if (arenas) {
      const active = await prisma.arenaHistory.findFirst({
        orderBy: { last_active: 'desc' },
      });

      if (active) {
        res.send({
          active_arena_history_id: active.arena_history_id,
          saved_arenas: arenas,
        });
      }
    }
  } catch (e) {
    console.log(e);
    res.status(500).send('Server Error');
  }
});

router.get('/single/:id', async (req, res) => {
  try {
    const rows = await prisma.arenaHistory.findMany({
      where: { arena_history_id: parseInt(req.params.id, 10) },
    });
    res.send(rows);
  } catch (e) {
    console.log(e);
    res.status(500).send('Server Error');
  }
});

router.delete('/single/:id', async (req, res) => {
  try {
    if (req.params.id) {
      const deleteResult = await prisma.arenaHistory.delete({
        where: { arena_history_id: parseInt(req.params.id, 10) },
      });

      if (deleteResult) {
        const rows = await prisma.arenaHistory.findMany({
          orderBy: { last_updated: 'desc' },
          take: 10,
        });
        res.send(rows);
      }
    } else {
      res.send('Missing args for arena/delete');
    }
  } catch (e) {
    console.log(e);
    res.status(500).send('Server Error');
  }
});

router.post('/load/:id', async (req, res) => {
  try {
    // stubbed: return empty result
    res.send({ active_arena_history_id: null, saved_arenas: [] });
  } catch (e) {
    console.log(e);
    res.status(500).send('Server Error');
  }
});

router.post('/create', async (req, res) => {
  try {
    const { name, size } = req.body;
    if (name && size) {
      const seed = crypto.randomBytes(20).toString('hex');
      // stub: do not write to DB
  (req.app.locals as any).arena = { name, seed, size };
  wss.send('arena', (req.app.locals as any).arena);
      res.send([]);
    } else {
      res.status(500).send('Missing required fields');
    }
  } catch (e) {
    console.log(e);
    res.status(500).send('Server Error');
  }
});

export default router;
