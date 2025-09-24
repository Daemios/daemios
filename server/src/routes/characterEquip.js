
import express from 'express';
import prisma from '../lib/prisma.js';

const router = express.Router();

function ensureAuth(req, res, next) {
  if (!req.session || !req.session.passport || !req.session.passport.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
}

// body: { characterId, itemId, targetSlot }
router.post('/equip', ensureAuth, async (req, res) => {
  // resolve user id from session passport info (handles either object or id)
  let userId = null;
  if (req.session && req.session.passport && req.session.passport.user) {
    const puser = req.session.passport.user;
    userId = (puser && puser.id) ? puser.id : puser;
  }
  const { characterId: bodyCharacterId, itemId, targetSlot } = req.body || {};

  // If caller omitted characterId, attempt to use the active character for the session's user.
  let characterId = bodyCharacterId;
  try {
    if (!characterId) {
      const chars = await import('../lib/characters.js');
      const character = await chars.default.getActiveCharacter(userId);
      if (character && character.id) characterId = character.id;
    }
  } catch (e) {
    console.warn('characterEquip: failed to resolve active character from session', e && e.code);
  }

  if (!itemId || !targetSlot) return res.status(400).json({ error: 'Missing parameters: itemId and targetSlot are required' });
  if (!characterId) return res.status(404).json({ error: 'No active character found for session' });

  // Normalize slot to uppercase enum value expected by Prisma (EquipmentSlot)
  const normalizedSlot = String(targetSlot).toUpperCase();

  try {
    // Validate character belongs to user
    const character = await prisma.character.findUnique({ where: { id: characterId } });
    if (!character || character.userId !== userId) return res.status(403).json({ error: 'Invalid character' });

    // Fetch item and ensure ownership
    const item = await prisma.item.findUnique({ where: { id: itemId } });
    if (!item || item.characterId !== characterId) return res.status(403).json({ error: 'Invalid item or not owned by character' });

    // If item is a container, try to find its Container record so we can
    // update its capacity. If the database schema hasn't been migrated to
    // include Container.itemId, prisma will throw P2022; in that case we
    // cannot update capacity and should return an error because the client
    // promised capacity data for a container.
    let newContainer = null;
    try {
      newContainer = await prisma.container.findFirst({ where: { itemId: itemId } });
    } catch (err) {
      if (err && err.code === 'P2022') {
        console.warn('characterEquip: Container.itemId column missing; skipping container mapping');
        newContainer = null;
      } else {
        throw err;
      }
    }

    // If the item is a container, the server will determine the capacity
    // from the Item record (item.capacity) or the existing Container record.
    // This avoids requiring the client to send capacity data.
    if (item.isContainer && !newContainer) {
      // If the item is flagged as a container but there is no Container
      // linked via Container.itemId, we cannot proceed.
      return res.status(400).json({ error: 'Container record not found for this item; cannot set capacity' });
    }

    // Find currently equipped item in that slot
    let currentEquip = null;
    try {
  currentEquip = await prisma.equipment.findUnique({ where: { characterId_slot: { characterId, slot: normalizedSlot } } });
    } catch (e) {
      currentEquip = null;
    }

    // Determine where the new item came from (source container) so we can
    // swap the previous equipment back into that place. If the new item has
    // a containerId, it came from a container (e.g. Pockets). If not, it's
    // likely already unequipped.
    const sourceContainerId = item.containerId || null;
    const sourceIndex = Number.isInteger(item.containerIndex) ? item.containerIndex : null;

    // Load currently equipped item (if any)
    const equipmentRow = currentEquip;
    const oldItemId = equipmentRow ? equipmentRow.itemId : null;
    let oldItem = null;
    if (oldItemId) {
      oldItem = await prisma.item.findUnique({ where: { id: oldItemId } });
    }

    // Perform the equip + swap inside a single transaction callback so that
    // computing the first-free index and updating items is atomic and not
    // racy. If any container-not-found / full condition occurs, throw an
    // Error with a `status` property that we'll map to a 400 response below.
    try {
      await prisma.$transaction(async (tx) => {
        // determine target container/index for the old item (if any)
        let targetContainerForOldItem = null;
        let targetIndexForOldItem = null;

        if (oldItem) {
          if (sourceContainerId) {
            const srcContainer = await tx.container.findUnique({ where: { id: sourceContainerId } });
            if (!srcContainer) {
              const e = new Error('Source container not found');
              e.status = 400;
              throw e;
            }
            const cap = srcContainer.capacity || 0;
            // If we know the original index the new item occupied, prefer
            // swapping into that exact index. This ensures the UI keeps the
            // same slot when swapping containers even if the container is full.
            if (Number.isInteger(sourceIndex) && sourceIndex >= 0 && sourceIndex < cap) {
              // ensure the occupant at that index is either the incoming item
              // (which we'll detach) or empty. If some other item occupies
              // the index, we can't safely swap into it.
              const occupant = await tx.item.findFirst({
                where: { containerId: srcContainer.id, containerIndex: sourceIndex },
                select: { id: true }
              });
              if (occupant && occupant.id !== itemId) {
                const e = new Error('Source index occupied by another item');
                e.status = 400;
                throw e;
              }
              targetContainerForOldItem = srcContainer.id;
              targetIndexForOldItem = sourceIndex;
            } else {
              // fall back to finding the first free index
              const used = await tx.item.findMany({
                where: { containerId: srcContainer.id },
                select: { containerIndex: true }
              });
              const usedSet = new Set(
                (used || []).map((u) => u.containerIndex).filter((n) => Number.isInteger(n))
              );
              let freeIdx = -1;
              for (let i = 0; i < cap; i++) if (!usedSet.has(i)) { freeIdx = i; break; }
              if (freeIdx < 0) {
                const e = new Error('Source container is full');
                e.status = 400;
                throw e;
              }
              targetContainerForOldItem = srcContainer.id;
              targetIndexForOldItem = freeIdx;
            }
          } else {
            const pockets = await tx.container.findFirst({ where: { characterId, name: 'Pockets' } });
            if (!pockets) {
              const e = new Error('No Pockets container available to place unequipped item');
              e.status = 400;
              throw e;
            }
            const cap = pockets.capacity || 0;
            const used = await tx.item.findMany({
              where: { containerId: pockets.id },
              select: { containerIndex: true }
            });
            const usedSet = new Set(
              (used || []).map((u) => u.containerIndex).filter((n) => Number.isInteger(n))
            );
            let freeIdx = -1;
            for (let i = 0; i < cap; i++) if (!usedSet.has(i)) { freeIdx = i; break; }
            if (freeIdx < 0) {
              const e = new Error('Pockets are full');
              e.status = 400;
              throw e;
            }
            targetContainerForOldItem = pockets.id;
            targetIndexForOldItem = freeIdx;
          }
        }

        // If the item is a container, determine capacity from the Item row
        // (fall back to existing container.capacity) and update the
        // Container.capacity if necessary. Validate the new capacity can
        // accommodate existing items.
        if (item.isContainer) {
          const c = await tx.container.findFirst({ where: { itemId: itemId } });
          if (!c) {
            const e = new Error('Container record not found inside transaction');
            e.status = 400;
            throw e;
          }
          // Prefer capacity declared on the Item row, otherwise use the
          // existing container.capacity.
          const capacityFromItem = Number.isInteger(item.capacity) ? item.capacity : (Number.isInteger(c.capacity) ? c.capacity : null);
          if (capacityFromItem === null) {
            const e = new Error('Container capacity unknown');
            e.status = 400;
            throw e;
          }
          const currentCount = await tx.item.count({ where: { containerId: c.id } });
          if (capacityFromItem < currentCount) {
            const e = new Error('New capacity is less than current items in container');
            e.status = 400;
            throw e;
          }
          await tx.container.update({ where: { id: c.id }, data: { capacity: capacityFromItem } });
        }

        // upsert equipment row (point slot at the new item)
        await tx.equipment.upsert({
          where: { characterId_slot: { characterId, slot: normalizedSlot } },
          update: { itemId },
          create: { characterId, slot: normalizedSlot, itemId }
        });

        // detach new item from its container (now equipped)
        await tx.item.update({ where: { id: itemId }, data: { containerId: null, containerIndex: null } });

        // place old item into determined container/index
        if (oldItem && targetContainerForOldItem !== null) {
          await tx.item.update({ where: { id: oldItem.id }, data: { containerId: targetContainerForOldItem, containerIndex: targetIndexForOldItem } });
        }
      });
    } catch (e) {
      // map expected 400-level transaction errors back to HTTP 400
      if (e && e.status === 400) return res.status(400).json({ error: e.message });
      throw e;
    }

    const equipment = await prisma.equipment.findMany({ where: { characterId }, include: { Item: true } });

    // Return canonical containers for the character so the client can update
    // inventory atomically (ensure container items are ordered by index)
    const containers = await prisma.container.findMany({
      where: { characterId },
      include: { items: { orderBy: { containerIndex: 'asc' } } },
    });

    // Indicate whether any container capacity was updated as part of this
    // transaction. If the equipped item was a container, we updated the
    // corresponding Container.capacity above; include its id so the client
    // can replace that container wholesale.
    const updatedContainerIds = [];
    if (item.isContainer) {
      const linked = await prisma.container.findFirst({ where: { itemId: itemId } });
      if (linked && linked.id) updatedContainerIds.push(linked.id);
    }

    const capacityUpdated = updatedContainerIds.length > 0;

    return res.json({ success: true, equipment, containers, capacityUpdated, updatedContainerIds });

  } catch (err) {
    console.error('Equip error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
