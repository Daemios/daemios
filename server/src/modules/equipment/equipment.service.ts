import { prisma } from '../../db/prisma';
import { EquipmentSlot } from '@prisma/client';
import { ensureItemBelongsToCharacter, DomainError, iconForContainerType, containerIsDescendantOfItem, isValidForSlot } from './equipment.domain';

export async function equipItemToCharacter(characterId: number, itemId: number, slot: EquipmentSlot) {
  // Use a transaction so we both upsert the equipment and clear any
  // container references atomically. This mirrors the behavior in
  // performEquipForCharacter so all equip code paths leave the DB in a
  // consistent state (item.containerId cleared and any container that
  // represented the item unlinked).
  // Upsert the equipment row and clear any container references for the item.
  // Using a plain sequence here keeps the operation simple and makes it easy
  // to mock in tests. In the future this can be converted back to a
  // transaction if atomicity across multiple tables becomes necessary.
  const upserted = await prisma.equipment.upsert({
    where: { characterId_slot: { characterId, slot } as any },
    create: { characterId, slot, itemId },
    update: { itemId },
  });

  // Clear the item's container reference so it is not also listed in a container
  await prisma.item.update({ where: { id: itemId }, data: { containerId: null, containerIndex: null } });

  return upserted;
}

export async function unequipItemFromSlot(characterId: number, slot: EquipmentSlot) {
  const existing = await prisma.equipment.findUnique({ where: { characterId_slot: { characterId, slot } as any } });
  if (!existing) return null;
  await prisma.equipment.delete({ where: { id: existing.id } });
  return existing;
}

export async function listEquipmentForCharacter(characterId: number) {
  return prisma.equipment.findMany({ where: { characterId }, include: { Item: true } });
}

export async function performEquipForCharacter(characterId: number, itemId: number, targetSlot: string) {
  const normalizedSlot = String(targetSlot).toUpperCase();

  const character = await prisma.character.findUnique({ where: { id: characterId } });
  if (!character) throw new DomainError('INVALID_CHARACTER', 'Invalid character');
  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item) throw new DomainError('ITEM_NOT_FOUND', 'Item not found');
  if (item.characterId !== characterId) throw new DomainError('ITEM_NOT_OWNED', 'Item not owned by character');

  let newContainer: any = null;
  try {
    newContainer = await prisma.container.findFirst({ where: { itemId } });
  } catch (err: any) {
    if (err && err.code === 'P2022') {
      newContainer = null;
    } else throw err;
  }
  // Note: we do not immediately fail if the container record is missing
  // here. It is possible the DB is in an inconsistent state (container
  // record missing) and we can recover by creating the container record
  // inside the equip transaction. The transaction below will validate
  // capacity and create the container when necessary.

  const declaredSlot = (item && item.equipmentSlot) ? String(item.equipmentSlot).toUpperCase() : null;
  // Fail fast if the item's declared equip slot doesn't match the requested one.
  if (!declaredSlot || declaredSlot !== normalizedSlot) throw new DomainError('INVALID_SLOT', 'Item equipmentSlot does not match target slot');
  // Domain validation: ensure item is legal for this slot
  if (!isValidForSlot(item, newContainer, normalizedSlot)) throw new DomainError('INVALID_ITEM_FOR_SLOT', 'Item cannot be equipped into that slot');

  await prisma.$transaction(async (tx: any) => {
    let currentEquip: any = null;
    try { currentEquip = await tx.equipment.findUnique({ where: { characterId_slot: { characterId, slot: normalizedSlot } } }); } catch (e) { currentEquip = null; }
    const equipmentRow = currentEquip;
    const oldItemId = equipmentRow ? equipmentRow.itemId : null;
    let oldItem: any = null;
    if (oldItemId) oldItem = await tx.item.findUnique({ where: { id: oldItemId } });

    const sourceContainerId = item.containerId || null;
    const sourceIndex = Number.isInteger(item.containerIndex) ? item.containerIndex : null;

    let targetContainerForOldItem: any = null;
    let targetIndexForOldItem: any = null;
    if (oldItem) {
      if (sourceContainerId) {
        const srcContainer = await tx.container.findUnique({ where: { id: sourceContainerId } });
        if (!srcContainer) throw new DomainError('SOURCE_CONTAINER_NOT_FOUND', 'Source container not found');
        const cap = srcContainer.capacity || 0;
        if (Number.isInteger(sourceIndex) && sourceIndex >= 0 && sourceIndex < cap) {
          const occupant = await tx.item.findFirst({ where: { containerId: srcContainer.id, containerIndex: sourceIndex }, select: { id: true } });
          if (occupant && occupant.id !== itemId) throw new DomainError('SOURCE_INDEX_OCCUPIED', 'Source index occupied by another item');
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
          if (freeIdx < 0) throw new DomainError('SOURCE_CONTAINER_FULL', 'Source container is full');
          targetContainerForOldItem = srcContainer.id;
          targetIndexForOldItem = freeIdx;
        }
      } else {
        const pockets = await tx.container.findFirst({ where: { characterId, name: 'Pockets' } });
        if (!pockets) throw new DomainError('NO_POCKETS', 'No Pockets container available to place unequipped item');
        const cap = pockets.capacity || 0;
        const used = await tx.item.findMany({ where: { containerId: pockets.id }, select: { containerIndex: true } });
        const indexes2 = (used || []).map((u: any) => u.containerIndex).filter((n: any) => Number.isInteger(n));
        const usedSet2 = new Set(indexes2);
        let freeIdx = -1;
        for (let idx2 = 0; idx2 < cap; idx2 += 1) {
          if (!usedSet2.has(idx2)) { freeIdx = idx2; break; }
        }
        if (freeIdx < 0) throw new DomainError('POCKETS_FULL', 'Pockets are full');
        targetContainerForOldItem = pockets.id;
        targetIndexForOldItem = freeIdx;
      }
    }

    if (oldItem && oldItem.isContainer && targetContainerForOldItem !== null) {
      // Prevent cycles: placing a container into itself or its descendants
      const wouldDescend = await containerIsDescendantOfItem(tx, targetContainerForOldItem, oldItem.id);
      if (wouldDescend) throw new DomainError('CANNOT_PLACE_CONTAINER_IN_SELF', 'Cannot place a container into itself or its nested containers');
    }

    if (item.isContainer) {
      // Ensure minimal container metadata exists for capacity checks.
      let c = await tx.container.findFirst({ where: { itemId } });
      if (!c) {
        const baseName = String(item.label || item.name || 'Container').substring(0, 60);
        const uniqueName = `${baseName}-${itemId}`;
        try {
          c = await tx.container.create({
            data: {
              itemId,
              name: uniqueName,
              capacity: Number.isInteger(item.capacity) ? item.capacity : 0,
              characterId,
              removable: true,
              containerType: (item.itemType ? String(item.itemType).toUpperCase() : 'PACK'),
            },
          });
        } catch (err: any) {
          // If creating the container record fails for any reason, surface a
          // domain-specific error so callers/tests can handle it consistently.
          throw new DomainError('CONTAINER_RECORD_NOT_FOUND', 'Cannot create container record');
        }
      }
      // Determine capacity preference: explicit item.capacity > container.capacity
      let capacityFromItem: any = null;
      if (Number.isInteger(item.capacity)) capacityFromItem = item.capacity;
      else if (Number.isInteger(c.capacity)) capacityFromItem = c.capacity;
      else capacityFromItem = null;
      if (capacityFromItem === null) throw new DomainError('CONTAINER_CAPACITY_UNKNOWN', 'Container capacity unknown');
      const currentCount = await tx.item.count({ where: { containerId: c.id } });
      if (capacityFromItem < currentCount) throw new DomainError('CONTAINER_OVERFLOW', 'New capacity is less than current items in container');
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
    // When an item is equipped, clear its container reference so it is no
    // longer listed as residing in an unequipped container.
    await tx.item.update({ where: { id: itemId }, data: { containerId: null, containerIndex: null } });

    // Note: do NOT unlink container.itemId here. Container records
    // represent the container structure and must exist for capacity
    // validation; unlinking them prematurely can cause subsequent
    // equip attempts to fail with CONTAINER_RECORD_NOT_FOUND. We will
    // only clear the item's container reference below.
    if (oldItem && targetContainerForOldItem !== null) {
      await tx.item.update({ where: { id: oldItem.id }, data: { containerId: targetContainerForOldItem, containerIndex: targetIndexForOldItem } });
    }
  });

    const equipment = await prisma.equipment.findMany({ where: { characterId }, include: { Item: true } });
  const containers = await prisma.container.findMany({ where: { characterId }, include: { items: { orderBy: { containerIndex: 'asc' } } } });
  const annotatedContainers = containers.map((c: any) => ({
    ...c,
    containerType: c.containerType || 'BASIC',
    icon: iconForContainerType(c.containerType),
    items: (c.items || []).map((it: any) => ({ ...it, img: it.image || it.img || '/img/debug/placeholder.png', label: it.label || it.name || null })),
  }));
  // Remove the item that was just equipped from any container listing so the
  // inventory response does not still show it as present in a container.
  for (const c of annotatedContainers) {
    c.items = (c.items || []).filter((it: any) => Number(it.id) !== Number(itemId));
  }
  const updatedContainerIds: any[] = [];
  if (item.isContainer) {
    const linked = await prisma.container.findFirst({ where: { itemId } });
    if (linked && linked.id) updatedContainerIds.push(linked.id);
  }
  const capacityUpdated = updatedContainerIds.length > 0;
  return { equipment, containers: annotatedContainers, capacityUpdated, updatedContainerIds };
}
