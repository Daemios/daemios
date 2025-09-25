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
    itemType: it.itemType ? String(it.itemType) : null,
  };
}

// derive icon name (without mdi- prefix) from containerType enum value
function iconForContainerType(type) {
  const t = String(type || 'BASIC').toUpperCase();
  switch (t) {
    case 'LIQUID':
      return 'water';
    case 'CONSUMABLES':
      return 'food-apple';
    case 'PACK':
      return 'backpack';
    case 'POCKETS':
      return 'hand';
    case 'BASIC':
    default:
      return null;
  }
}

// helper: detect whether containerId falls inside the containment tree of
// the item with id ancestorItemId. Uses the provided Prisma client.
async function containerIsDescendantOfItem(prismaClient, containerId, ancestorItemId) {
  let curr = containerId;
  while (curr) {
    const c = await prismaClient.container.findUnique({ where: { id: curr }, select: { itemId: true } });
    if (!c) return false;
    if (c.itemId === ancestorItemId) return true;
    const rep = await prismaClient.item.findUnique({ where: { id: c.itemId }, select: { containerId: true } });
    if (!rep) return false;
    curr = rep.containerId;
  }
  return false;
}

// Response helpers to ensure consistent, human readable messages
function badRequest(res, message, details) {
  return res.status(400).json({ success: false, error: String(message || 'Bad request'), details: details || null });
}

function unauthorized(res, message) {
  return res.status(401).json({ success: false, error: String(message || 'Not authenticated') });
}

function notFound(res, message, details) {
  return res.status(404).json({ success: false, error: String(message || 'Not found'), details: details || null });
}

function serverError(res, message, details) {
  return res.status(500).json({ success: false, error: String(message || 'Server error'), details: details || null });
}

// New: session-backed inventory endpoint
// GET /inventory/
// Returns all containers owned by the active character (from session) including their items
router.get('/', async (req, res) => {
  try {
    // safe session read, split to satisfy line-length lint
    const userId = req.session
      && req.session.passport
      && req.session.passport.user
      && req.session.passport.user.id;
    if (!userId) return unauthorized(res, 'User must be authenticated to fetch inventory');

    const character = await characters.getActiveCharacter(userId);
    if (!character || !character.id) {
      return notFound(res, 'No active character found for the authenticated user');
    }

    // Fetch containers owned by this character, including items ordered by containerIndex
    let containers = await fetchContainersWithItems(character.id);
    // normalize items for client (img/label) and attach containerType/icon hint
    containers = containers.map((c) => ({
      id: c.id,
      label: c.label || null,
      capacity: c.capacity || 0,
      containerType: c.containerType || 'BASIC',
      icon: iconForContainerType(c.containerType),
      items: (c.items || []).map(mapItemForClient),
    }));

    return res.json({ success: true, characterId: character.id, containers });
  } catch (e) {
    console.error('inventory fetch failed', e);
    return serverError(res, 'Failed to fetch inventory', { message: e && e.message });
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
    if (!userId) return unauthorized(res, 'Authentication required to move items');

    const character = await characters.getActiveCharacter(userId);
    console.log('active character:', character && character.id);
    if (!character || !character.id) return notFound(res, 'Active character not found for user');

    const { itemId, source, target } = req.body || {};
    if (!itemId) return badRequest(res, 'Missing itemId in request body');
    if (!target) return badRequest(res, 'Missing target in request body');
    if (!Number.isInteger(target.localIndex) || target.localIndex < 0) return badRequest(res, 'target.localIndex must be a non-negative integer');
    if (target.containerId === undefined || target.containerId === null) return badRequest(res, 'target.containerId must be provided (use null for unequipped)');

    // load the item being moved (include ItemType for simple validation)
    const moving = await prisma.item.findUnique({ where: { id: Number(itemId) } });
    if (!moving) return notFound(res, 'Item not found');
    if (moving.characterId !== character.id) return res.status(403).json({ success: false, error: 'Item does not belong to the active character' });

    const src = source || { containerId: moving.containerId, localIndex: moving.containerIndex };
    const tgt = target;

    // Validate target container index and capacity. If target is null (unequipped)
    // these checks are skipped.
    if (tgt.containerId) {
      const targetContainer = await prisma.container.findUnique({ where: { id: tgt.containerId } });
      if (!targetContainer) return badRequest(res, 'Target container not found');
      if (!Number.isInteger(tgt.localIndex) || tgt.localIndex < 0) return badRequest(res, 'Invalid target index');
      if (tgt.localIndex >= targetContainer.capacity) return badRequest(res, 'Target index exceeds container capacity');

      // Prevent moving a container item into itself or its descendants
      if (moving.isContainer) {
        const wouldDescend = await containerIsDescendantOfItem(prisma, tgt.containerId, moving.id);
        if (wouldDescend) {
          console.warn(`inventory move blocked: moving container item ${moving.id} into container ${tgt.containerId} would create a self/descendant containment`);
          return badRequest(res, 'Cannot place a container into itself or its nested containers', { movingId: moving.id, targetContainerId: tgt.containerId });
        }
      }

      // Basic container-type rules: disallow moving items that don't match
      // simple heuristics for LIQUID and CONSUMABLES container types.
      if (targetContainer && targetContainer.containerType) {
        const ttype = String(targetContainer.containerType).toUpperCase();
        const itype = moving.itemType ? String(moving.itemType).toUpperCase() : '';
        if (ttype === 'LIQUID' && itype !== 'LIQUID') return badRequest(res, 'Only liquid items can be placed in this container');
        if (ttype === 'CONSUMABLES' && itype !== 'CONSUMABLE' && itype !== 'FOOD') return badRequest(res, 'Only consumable items can be placed in this container');
      }
    }

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
      id: c.id,
      label: c.label || null,
      capacity: c.capacity || 0,
      containerType: c.containerType || 'BASIC',
      icon: iconForContainerType(c.containerType),
      items: (c.items || []).map(mapItemForClient),
    }));

    return res.json({ success: true, message: 'Move completed', containers });
  } catch (e) {
    console.error('inventory move failed', e);
    return serverError(res, 'Move failed', { message: e && e.message });
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
