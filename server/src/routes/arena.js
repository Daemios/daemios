import { PrismaClient } from '@prisma/client';
import express from 'express';
import crypto from 'crypto';
import wss from '../lib/socket.js';
const router = express.Router();
const prisma = new PrismaClient();

router.post('/move', async (req, res) => {
  try {
    let accepted = false;
    console.log('validating movement');
    // Validate the movement here
    if (true) { // Replace with actual validation logic
      accepted = true;
    }
    res.send(accepted);
    wss.send('movement', 'test'); // Assuming wss is a WebSocket instance defined elsewhere
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
    const single = await prisma.arenaHistory.findFirst({
      where: { arena_history_id: req.params.id },
    });

    if (single) {
      await prisma.arenaHistory.update({
        where: { arena_history_id: single.arena_history_id },
        data: { last_active: new Date() },
      });

      const arenas = await prisma.arenaHistory.findMany({
        orderBy: { created_on: 'desc' },
        take: 10,
      });

      const active = await prisma.arenaHistory.findFirst({
        orderBy: { last_active: 'desc' },
      });

      if (arenas && active) {
  req.app.locals.arena.terrain = null;
        wss.send('arena', req.app.locals.arena); // Assuming wss is a WebSocket instance defined elsewhere
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

router.post('/create', async (req, res) => {
  try {
    const { name, size } = req.body;
    if (name && size) {
      const seed = crypto.randomBytes(20).toString('hex');
      const createResult = await prisma.arenaHistory.create({
        data: {
          name,
          seed,
          size,
        },
      });

      if (createResult) {
        const arenas = await prisma.arenaHistory.findMany({
          orderBy: { last_updated: 'desc' },
          take: 10,
        });

        if (arenas) {
          req.app.locals.arena.terrain = null;
          wss.send('arena', req.app.locals.arena); // Assuming wss is a WebSocket instance defined elsewhere
          res.send(arenas);
        }
      }
    } else {
      res.status(500).send('Missing required fields');
    }
  } catch (e) {
    console.log(e);
    res.status(500).send('Server Error');
  }
});

export default router;
