import express, { Request, Response } from 'express';
import { prisma } from '../db/prisma';
import { characterService } from '../modules/character/character.service';

const router = express.Router();

async function fetchContainersWithItems(characterId: number) {
  try {
    return prisma.container.findMany({
      where: { characterId },
      include: { items: { orderBy: { containerIndex: 'asc' } } },
    });
  } catch (err: any) {
    if (err && err.code === 'P2022') {
      console.warn('fetchContainersWithItems: schema mismatch, falling back to basic container fetch');
      return prisma.container.findMany({ where: { characterId } });
    }
    throw err;
  }
}

function mapItemForClient(it: any) {
  if (!it) return null;
  return {
    ...it,
    img: it.image || it.img || '/img/debug/placeholder.png',
    label: it.label || it.name || null,
    itemType: it.itemType ? String(it.itemType) : null,
  };
}

function iconForContainerType(type: any) {
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

async function containerIsDescendantOfItem(prismaClient: any, containerId: number, ancestorItemId: number) {
  let curr: number | null = containerId;
  while (curr) {
    const c = await prismaClient.container.findUnique({ where: { id: curr }, select: { itemId: true } });
  if (!c) return false;
  if (!c.itemId) return false;
  if (c.itemId === ancestorItemId) return true;
  const rep = await prismaClient.item.findUnique({ where: { id: c.itemId }, select: { containerId: true } });
    if (!rep) return false;
    curr = rep.containerId as number | null;
  }
  return false;
}

function badRequest(res: Response, message: any, details?: any) {
  return res.status(400).json({ success: false, error: String(message || 'Bad request'), details: details || null });
}

function unauthorized(res: Response, message?: any) {
  return res.status(401).json({ success: false, error: String(message || 'Not authenticated') });
}

function notFound(res: Response, message?: any, details?: any) {
  return res.status(404).json({ success: false, error: String(message || 'Not found'), details: details || null });
}

function serverError(res: Response, message?: any, details?: any) {
  return res.status(500).json({ success: false, error: String(message || 'Server error'), details: details || null });
}

router.get('/', async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.session && req.session.passport && req.session.passport.user && req.session.passport.user.id;
    if (!userId) return unauthorized(res, 'User must be authenticated to fetch inventory');

  const character = await characterService.getActiveCharacterForUser(userId);
    if (!character || !character.id) {
      return notFound(res, 'No active character found for the authenticated user');
    }

    let containers = await fetchContainersWithItems(character.id);
    containers = containers.map((c: any) => ({
      id: c.id,
      label: c.label || null,
      capacity: c.capacity || 0,
      containerType: c.containerType || 'BASIC',
      icon: iconForContainerType(c.containerType),
      items: (c.items || []).map(mapItemForClient),
    }));

    return res.json({ success: true, characterId: character.id, containers });
  } catch (e: any) {
    console.error('inventory fetch failed', e);
    return serverError(res, 'Failed to fetch inventory', { message: e && e.message });
  }
});

router.post('/move', async (req: Request, res: Response) => {
  try {
    console.log('/inventory/move called, body=', req.body);
    // @ts-ignore
    const userId = req.session && req.session.passport && req.session.passport.user && req.session.passport.user.id;
    console.log('userId from session:', userId);
    if (!userId) return unauthorized(res, 'Authentication required to move items');

  const character = await characterService.getActiveCharacterForUser(userId);
    console.log('active character:', character && character.id);
    if (!character || !character.id) return notFound(res, 'Active character not found for user');

    const { itemId, source, target } = req.body || {};
    if (!itemId) return badRequest(res, 'Missing itemId in request body');
    if (!target) return badRequest(res, 'Missing target in request body');
    if (!Number.isInteger(target.localIndex) || target.localIndex < 0) return badRequest(res, 'target.localIndex must be a non-negative integer');
    if (target.containerId === undefined || target.containerId === null) return badRequest(res, 'target.containerId must be provided (use null for unequipped)');

    const moving = await prisma.item.findUnique({ where: { id: Number(itemId) } });
    if (!moving) return notFound(res, 'Item not found');
    if (moving.characterId !== character.id) return res.status(403).json({ success: false, error: 'Item does not belong to the active character' });

    const src = source || { containerId: moving.containerId, localIndex: moving.containerIndex };
    const tgt = target;

    if (tgt.containerId) {
      const targetContainer = await prisma.container.findUnique({ where: { id: tgt.containerId } });
      if (!targetContainer) return badRequest(res, 'Target container not found');
      if (!Number.isInteger(tgt.localIndex) || tgt.localIndex < 0) return badRequest(res, 'Invalid target index');
      if (tgt.localIndex >= targetContainer.capacity) return badRequest(res, 'Target index exceeds container capacity');

      if (moving.isContainer) {
        const wouldDescend = await containerIsDescendantOfItem(prisma, tgt.containerId, moving.id);
        if (wouldDescend) {
          console.warn(`inventory move blocked: moving container item ${moving.id} into container ${tgt.containerId} would create a self/descendant containment`);
          return badRequest(res, 'Cannot place a container into itself or its nested containers', { movingId: moving.id, targetContainerId: tgt.containerId });
        }
      }

      if (targetContainer && targetContainer.containerType) {
        const ttype = String(targetContainer.containerType).toUpperCase();
        const itype = moving.itemType ? String(moving.itemType).toUpperCase() : '';
        if (ttype === 'LIQUID' && itype !== 'LIQUID') return badRequest(res, 'Only liquid items can be placed in this container');
        if (ttype === 'CONSUMABLES' && itype !== 'CONSUMABLE' && itype !== 'FOOD') return badRequest(res, 'Only consumable items can be placed in this container');
      }
    }

    const occupied = await prisma.item.findFirst({ where: { containerId: tgt.containerId, containerIndex: tgt.localIndex } });

    if (occupied) {
      const sameContainer = src.containerId === tgt.containerId;
      if (sameContainer) {
        const TEMP_INDEX = -999999;
        await prisma.$transaction([
          prisma.item.update({ where: { id: moving.id }, data: { containerIndex: TEMP_INDEX } }),
          prisma.item.update({ where: { id: occupied.id }, data: { containerIndex: src.localIndex } }),
          prisma.item.update({ where: { id: moving.id }, data: { containerId: tgt.containerId, containerIndex: tgt.localIndex } }),
        ]);
      } else {
        await prisma.$transaction([
          prisma.item.update({ where: { id: occupied.id }, data: { containerId: src.containerId, containerIndex: src.localIndex } }),
          prisma.item.update({ where: { id: moving.id }, data: { containerId: tgt.containerId, containerIndex: tgt.localIndex } }),
        ]);
      }
    } else {
      await prisma.item.update({ where: { id: moving.id }, data: { containerId: tgt.containerId, containerIndex: tgt.localIndex } });
    }

    let containers = await fetchContainersWithItems(character.id);
    containers = containers.map((c: any) => ({
      id: c.id,
      label: c.label || null,
      capacity: c.capacity || 0,
      containerType: c.containerType || 'BASIC',
      icon: iconForContainerType(c.containerType),
      items: (c.items || []).map(mapItemForClient),
    }));

    return res.json({ success: true, message: 'Move completed', containers });
  } catch (e: any) {
    console.error('inventory move failed', e);
    return serverError(res, 'Move failed', { message: e && e.message });
  }
});

router.get('/:id', async (_req: Request, res: Response) => res.status(501).json({ error: 'Legacy inventory GET by id is not supported. Use /inventory/.' }));
router.post('/:id', async (_req: Request, res: Response) => res.status(501).json({ error: 'Legacy inventory POST by id is not supported.' }));
router.patch('/:id', async (_req: Request, res: Response) => res.status(501).json({ error: 'Legacy inventory PATCH by id is not supported.' }));

export default router;
