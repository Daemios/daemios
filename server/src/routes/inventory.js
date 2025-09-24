import express from 'express';
import prisma from '../lib/prisma.js';
import characters from '../lib/characters.js';

const router = express.Router();

// Helper: fetch containers and include items (resilient to missing itemId column)
async function fetchContainersWithItems(characterId) {
  try {
    return prisma.container.findMany({
      where: { characterId },
      include: { items: { orderBy: { containerIndex: 'asc' } } },
    });
  } catch (err) {
    // handle missing column (P2022) by falling back to a simpler query
    if (err && err.code === 'P2022') {
      console.warn('fetchContainersWithItems: schema mismatch, falling back to basic container fetch');
      return prisma.container.findMany({ where: { characterId } });
    }
    throw err;
  }
}

// map DB item -> client shape
function mapItemForClient(it) {
  if (!it) return null;
  return {
    ...it,
    img: it.image || it.img || '/img/debug/placeholder.png',
    label: it.label || it.name || null,
  };
}

// New: session-backed inventory endpoint
// GET /inventory/
// Returns all containers owned by the active character (from session) including their items
router.get('/', async (req, res) => {
  try {
    const userId = req.session
      && req.session.passport
      && req.session.passport.user
      && req.session.passport.user.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });
    const character = await characters.getActiveCharacter(userId);

    if (!character || !character.id) {
      return res.status(404).json({ error: 'No active character found' });
    }

    // Fetch containers owned by this character, including items ordered by containerIndex
    let containers = await fetchContainersWithItems(character.id);
    // normalize items for client (img/label)
    containers = containers.map((c) => ({
      ...c,
      items: (c.items || []).map(mapItemForClient),
    }));

    return res.json({ success: true, characterId: character.id, containers });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server Error' });
  }
});

// POST /inventory/move
// Body: { itemId, source: { containerId, localIndex }, target: { containerId, localIndex } }
router.post('/move', async (req, res) => {
  try {
    console.log('/inventory/move called, body=', req.body);
    const userId = req.session
      && req.session.passport
      && req.session.passport.user
      && req.session.passport.user.id;
    console.log('userId from session:', userId);
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const character = await characters.getActiveCharacter(userId);
    console.log('active character:', character && character.id);
    if (!character || !character.id) {
      return res.status(404).json({ error: 'No active character' });
    }

    const { itemId, source, target } = req.body || {};
    if (!itemId || !target || typeof target.localIndex !== 'number' || !target.containerId) {
      return res.status(400).json({ error: 'Invalid parameters' });
    }

    // load the item being moved
    const moving = await prisma.item.findUnique({ where: { id: Number(itemId) } });
    if (!moving) return res.status(404).json({ error: 'Item not found' });
    if (moving.characterId !== character.id) return res.status(403).json({ error: 'Item does not belong to active character' });

    const src = source || { containerId: moving.containerId, localIndex: moving.containerIndex };
    const tgt = target;

    // find any item occupying the target slot
    const occupied = await prisma.item.findFirst({
      where: { containerId: tgt.containerId, containerIndex: tgt.localIndex },
    });

    // perform transactional move with swap handling
    if (occupied) {
      const sameContainer = src.containerId === tgt.containerId;
      if (sameContainer) {
        // swapping within same container: use temporary index to avoid unique constraint conflict
        const TEMP_INDEX = -999999;
        await prisma.$transaction([
          prisma.item.update({
            where: { id: moving.id },
            data: { containerIndex: TEMP_INDEX },
          }),
          prisma.item.update({
            where: { id: occupied.id },
            data: { containerIndex: src.localIndex },
          }),
          prisma.item.update({
            where: { id: moving.id },
            data: { containerId: tgt.containerId, containerIndex: tgt.localIndex },
          }),
        ]);
      } else {
        // different containers: swap directly in a transaction
        await prisma.$transaction([
          prisma.item.update({
            where: { id: occupied.id },
            data: { containerId: src.containerId, containerIndex: src.localIndex },
          }),
          prisma.item.update({
            where: { id: moving.id },
            data: { containerId: tgt.containerId, containerIndex: tgt.localIndex },
          }),
        ]);
      }
    } else {
      // target empty: just move
      await prisma.item.update({
        where: { id: moving.id },
        data: { containerId: tgt.containerId, containerIndex: tgt.localIndex },
      });
    }

    // Return updated containers for the active character
    let containers = await fetchContainersWithItems(character.id);
    containers = containers.map((c) => ({
      ...c,
      items: (c.items || []).map(mapItemForClient),
    }));

    return res.json({ success: true, containers });
  } catch (e) {
    console.error('inventory move failed', e);
    return res.status(500).json({ error: 'Move failed' });
  }
});

// Legacy routes removed: these endpoints referenced legacy models that don't exist
// in the current Prisma schema. Keep the route placeholders so older clients
// receive a clear response rather than crashing the server.
router.get('/:id', async (req, res) => res.status(501).json({ error: 'Legacy inventory GET by id is not supported. Use /inventory/.' }));
router.post('/:id', async (req, res) => res.status(501).json({ error: 'Legacy inventory POST by id is not supported.' }));
router.patch('/:id', async (req, res) => res.status(501).json({ error: 'Legacy inventory PATCH by id is not supported.' }));

// POST /inventory/move
// Body: { itemId, source: { containerId, localIndex }, target: { containerId, localIndex } }
// (duplicate moved earlier and removed)

export default router;
