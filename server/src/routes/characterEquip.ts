import express from 'express';
import { prisma } from '../db/prisma';
import { characterService } from '../modules/character/character.service';

const router = express.Router();

function ensureAuth(req: any, res: any, next: any) {
  if (!req.session || !req.session.passport || !req.session.passport.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
}

function iconForContainerType(type: any) {
  const t = String(type || 'BASIC').toUpperCase();
  switch (t) {
    case 'LIQUID': return 'water';
    case 'CONSUMABLES': return 'food-apple';
    case 'PACK': return 'backpack';
    case 'POCKETS': return 'hand';
    default: return null;
  }
}

async function containerIsDescendantOfItem(tx: any, containerId: any, ancestorItemId: any) {
  if (!containerId) return false;
  const c = await tx.container.findUnique({ where: { id: containerId }, select: { itemId: true } });
  if (!c) return false;
  if (c.itemId === ancestorItemId) return true;
  const rep = await tx.item.findUnique({ where: { id: c.itemId }, select: { containerId: true } });
  if (!rep) return false;
  return containerIsDescendantOfItem(tx, rep.containerId, ancestorItemId);
}

function isValidForSlot(item: any, containerRow: any, slot: any) {
  if (!item || !slot) return false;
  const declared = item.itemType ? String(item.itemType).toUpperCase() : null;
  const s = String(slot || '').toUpperCase();
  return declared === s;
}

router.post('/equip', ensureAuth, async (req: any, res: any) => {
  let userId: any = null;
  if (req.session && req.session.passport && req.session.passport.user) {
    const puser = req.session.passport.user;
    userId = (puser && puser.id) ? puser.id : puser;
  }
  const { characterId: bodyCharacterId, itemId, targetSlot } = req.body || {};
  let characterId = bodyCharacterId;
  try {
    if (!characterId) {
      const character = await characterService.getActiveCharacterForUser(userId);
      if (character && character.id) characterId = character.id;
    }
  } catch (e) {
    console.warn('characterEquip: failed to resolve active character from session', e && (e as any).code);
  }
  if (!itemId || !targetSlot) return res.status(400).json({ error: 'Missing parameters: itemId and targetSlot are required' });
  if (!characterId) return res.status(404).json({ error: 'No active character found for session' });
  const normalizedSlot = String(targetSlot).toUpperCase();
  try {
    const character = await prisma.character.findUnique({ where: { id: characterId } });
    if (!character || character.userId !== userId) return res.status(403).json({ error: 'Invalid character' });
    const item = await prisma.item.findUnique({ where: { id: itemId } });
    if (!item || item.characterId !== characterId) return res.status(403).json({ error: 'Invalid item or not owned by character' });
    let newContainer: any = null;
    try {
      newContainer = await prisma.container.findFirst({ where: { itemId } });
    } catch (err: any) {
      if (err && err.code === 'P2022') {
        console.warn('characterEquip: Container.itemId column missing; skipping container mapping');
        newContainer = null;
      } else throw err;
    }
    if (item.isContainer && !newContainer) return res.status(400).json({ error: 'Container record not found for this item; cannot set capacity' });
    let currentEquip: any = null;
    try {
      currentEquip = await prisma.equipment.findUnique({ where: { characterId_slot: { characterId, slot: normalizedSlot } } });
    } catch (e) {
      currentEquip = null;
    }
    const sourceContainerId = item.containerId || null;
    const sourceIndex = Number.isInteger(item.containerIndex) ? item.containerIndex : null;
    const equipmentRow = currentEquip;
    const oldItemId = equipmentRow ? equipmentRow.itemId : null;
    let oldItem: any = null;
    if (oldItemId) oldItem = await prisma.item.findUnique({ where: { id: oldItemId } });
    const declaredSlot = (item && item.itemType) ? String(item.itemType).toUpperCase() : null;
    if (!declaredSlot || declaredSlot !== normalizedSlot) {
      return res.status(400).json({ error: 'Item type slot does not match target slot' });
    }
    if (!isValidForSlot(item, newContainer, normalizedSlot)) return res.status(400).json({ error: 'Item cannot be equipped into that slot' });
    try {
      await prisma.$transaction(async (tx: any) => {
        let targetContainerForOldItem: any = null;
        let targetIndexForOldItem: any = null;
        if (oldItem) {
          if (sourceContainerId) {
            const srcContainer = await tx.container.findUnique({ where: { id: sourceContainerId } });
            if (!srcContainer) { const e: any = new Error('Source container not found'); e.status = 400; throw e; }
            const cap = srcContainer.capacity || 0;
            if (Number.isInteger(sourceIndex) && sourceIndex >= 0 && sourceIndex < cap) {
              const occupant = await tx.item.findFirst({ where: { containerId: srcContainer.id, containerIndex: sourceIndex }, select: { id: true } });
              if (occupant && occupant.id !== itemId) { const e: any = new Error('Source index occupied by another item'); e.status = 400; throw e; }
              targetContainerForOldItem = srcContainer.id;
              targetIndexForOldItem = sourceIndex;
            } else {
              const used = await tx.item.findMany({ where: { containerId: srcContainer.id }, select: { containerIndex: true } });
              const indexes = (used || []).map((u: any) => u.containerIndex).filter((n: any) => Number.isInteger(n));
              const usedSet = new Set(indexes);
              let freeIdx = -1;
              for (let idx = 0; idx < cap; idx += 1) {
                if (!usedSet.has(idx)) { freeIdx = idx; break; }
              }
              if (freeIdx < 0) { const e: any = new Error('Source container is full'); e.status = 400; throw e; }
              targetContainerForOldItem = srcContainer.id;
              targetIndexForOldItem = freeIdx;
            }
          } else {
            const pockets = await tx.container.findFirst({ where: { characterId, name: 'Pockets' } });
            if (!pockets) { const e: any = new Error('No Pockets container available to place unequipped item'); e.status = 400; throw e; }
            const cap = pockets.capacity || 0;
            const used = await tx.item.findMany({ where: { containerId: pockets.id }, select: { containerIndex: true } });
            const indexes2 = (used || []).map((u: any) => u.containerIndex).filter((n: any) => Number.isInteger(n));
            const usedSet2 = new Set(indexes2);
            let freeIdx = -1;
            for (let idx2 = 0; idx2 < cap; idx2 += 1) {
              if (!usedSet2.has(idx2)) { freeIdx = idx2; break; }
            }
            if (freeIdx < 0) { const e: any = new Error('Pockets are full'); e.status = 400; throw e; }
            targetContainerForOldItem = pockets.id;
            targetIndexForOldItem = freeIdx;
          }
        }
        if (oldItem && oldItem.isContainer && targetContainerForOldItem !== null) {
          const wouldDescend = await containerIsDescendantOfItem(tx, targetContainerForOldItem, oldItem.id);
          if (wouldDescend) { const e: any = new Error('Cannot place a container into itself or its nested containers'); e.status = 400; throw e; }
        }
        if (item.isContainer) {
          const c = await tx.container.findFirst({ where: { itemId } });
          if (!c) { const e: any = new Error('Container record not found inside transaction'); e.status = 400; throw e; }
          let capacityFromItem: any = null;
          if (Number.isInteger(item.capacity)) {
            capacityFromItem = item.capacity;
          } else if (Number.isInteger(c.capacity)) {
            capacityFromItem = c.capacity;
          } else {
            capacityFromItem = null;
          }
          if (capacityFromItem === null) { const e: any = new Error('Container capacity unknown'); e.status = 400; throw e; }
          const currentCount = await tx.item.count({ where: { containerId: c.id } });
          if (capacityFromItem < currentCount) { const e: any = new Error('New capacity is less than current items in container'); e.status = 400; throw e; }
          await tx.container.update({ where: { id: c.id }, data: { capacity: capacityFromItem } });
        }
        const alreadyEquipped = await tx.equipment.findFirst({ where: { characterId, itemId } });
        if (alreadyEquipped) {
          await tx.equipment.update({ where: { id: alreadyEquipped.id }, data: { itemId: null } });
          const pocketsForChar = await tx.container.findFirst({ where: { characterId, name: 'Pockets' } });
          if (pocketsForChar) {
            const cap = pocketsForChar.capacity || 0;
            const used = await tx.item.findMany({ where: { containerId: pocketsForChar.id }, select: { containerIndex: true } });
            const indexes = (used || []).map((u: any) => u.containerIndex).filter((n: any) => Number.isInteger(n));
            const usedSet = new Set(indexes);
            let freeIdx = -1;
            for (let idx = 0; idx < cap; idx += 1) {
              if (!usedSet.has(idx)) { freeIdx = idx; break; }
            }
            if (freeIdx >= 0) {
              await tx.item.update({ where: { id: alreadyEquipped.itemId }, data: { containerId: pocketsForChar.id, containerIndex: freeIdx } });
            } else {
              await tx.item.update({ where: { id: alreadyEquipped.itemId }, data: { containerId: null, containerIndex: null } });
            }
          } else {
            await tx.item.update({ where: { id: alreadyEquipped.itemId }, data: { containerId: null, containerIndex: null } });
          }
        }

        await tx.equipment.upsert({ where: { characterId_slot: { characterId, slot: normalizedSlot } }, update: { itemId }, create: { characterId, slot: normalizedSlot, itemId } });
        if (oldItem) {
          const represented = await tx.container.findFirst({ where: { itemId: oldItem.id } });
          if (represented && String(represented.containerType).toUpperCase() === 'PACK') {
            const pockets = await tx.container.findFirst({ where: { characterId, name: 'Pockets' } });
            const destContainerId = pockets ? pockets.id : null;
            const itemsInPack = await tx.item.findMany({ where: { containerId: represented.id } });
            await Promise.all(itemsInPack.map(async (pi: any) => {
              if (pi.id === oldItem.id) {
                return tx.item.update({ where: { id: pi.id }, data: { containerId: null, containerIndex: null } });
              }
              if (destContainerId) {
                const wouldCycle = await containerIsDescendantOfItem(tx, destContainerId, pi.id);
                if (wouldCycle) {
                  return tx.item.update({ where: { id: pi.id }, data: { containerId: null, containerIndex: null } });
                }
              }
              return tx.item.update({ where: { id: pi.id }, data: { containerId: destContainerId, containerIndex: null } });
            }));
          }
        }
        await tx.item.update({ where: { id: itemId }, data: { containerId: null, containerIndex: null } });
        if (oldItem && targetContainerForOldItem !== null) {
          await tx.item.update({ where: { id: oldItem.id }, data: { containerId: targetContainerForOldItem, containerIndex: targetIndexForOldItem } });
        }
      });
    } catch (e) {
      if (e && (e as any).status === 400) return res.status(400).json({ error: (e as any).message });
      throw e;
    }
    const equipment = await prisma.equipment.findMany({ where: { characterId }, include: { Item: true } });
    const containers = await prisma.container.findMany({ where: { characterId }, include: { items: { orderBy: { containerIndex: 'asc' } } } });
    const annotatedContainers = containers.map((c: any) => ({ ...c, containerType: c.containerType || 'BASIC', icon: iconForContainerType(c.containerType) }));
    const updatedContainerIds: any[] = [];
    if (item.isContainer) {
      const linked = await prisma.container.findFirst({ where: { itemId } });
      if (linked && linked.id) updatedContainerIds.push(linked.id);
    }
    const capacityUpdated = updatedContainerIds.length > 0;
    return res.json({ success: true, equipment, containers: annotatedContainers, capacityUpdated, updatedContainerIds });
  } catch (err) {
    console.error('Equip error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
