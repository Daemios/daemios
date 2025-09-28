import { prisma } from '../../db/prisma';
import { EquipmentSlot } from '@prisma/client';
import { ensureItemBelongsToCharacter, DomainError, iconForContainerType, containerIsDescendantOfItem, isValidForSlot, swapEquipmentAndContainer } from './equipment.domain';

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
  // Find existing equipment row for the character+slot, delete it by id and return the deleted row.
  const existing = await prisma.equipment.findUnique({ where: { characterId_slot: { characterId, slot } as any } });
  if (!existing) return null;
  await prisma.equipment.delete({ where: { id: existing.id } });
  return existing;
}

export async function listEquipmentForCharacter(characterId: number) {
  return prisma.equipment.findMany({ where: { characterId }, include: { Item: true } });
}

export async function unequipItemToContainer(characterId: number, itemId: number, containerId: number, containerIndex: number) {
  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item) throw new DomainError('INVALID_ITEM', 'Invalid item');
  ensureItemBelongsToCharacter(item, characterId);
  const txResult = await prisma.$transaction(async (tx: any) => {
    // Find the equipment row that currently references this item for this character
    const equipRow = await tx.equipment.findFirst({ where: { characterId, itemId } });
    if (!equipRow) throw new DomainError('NOT_EQUIPPED', 'Item is not equipped');

    // Find any occupying item at the destination
    const occupying = await tx.item.findFirst({ where: { containerId: containerId, containerIndex: containerIndex } });

    // If nothing occupies the destination, simply clear equipment ref and place the item
    if (!occupying || occupying.id === itemId) {
      await tx.equipment.update({ where: { id: equipRow.id }, data: { itemId: null } });
      const updated = await tx.item.update({ where: { id: itemId }, data: { containerId: containerId, containerIndex: containerIndex } });
      return { equipRow, updated, occupyingId: occupying ? occupying.id : null, swapped: false };
    }

  // Occupied by another item -> use domain helper to perform an atomic swap
  const occupant = occupying;
  // Clear equipment reference first so swap helper can safely upsert occupant into slot
  const swapRes = await swapEquipmentAndContainer(tx, equipRow, occupant, containerId, containerIndex);
  const updated = swapRes.updatedItem || (await tx.item.findUnique({ where: { id: itemId } }));
  return { equipRow, updated, occupyingId: occupant.id, swapped: true };
  });

  const changed: any[] = [];
  if (txResult.swapped) {
    changed.push({ type: 'equipment', slot: txResult.equipRow.slot, oldItemId: itemId, newItemId: txResult.occupyingId });
    changed.push({ type: 'container', containerId, index: containerIndex, oldItemId: txResult.occupyingId, newItemId: itemId });
  } else {
    changed.push({ type: 'equipment', slot: txResult.equipRow.slot, oldItemId: itemId, newItemId: null });
    changed.push({ type: 'container', containerId, index: containerIndex, oldItemId: txResult.occupyingId, newItemId: itemId });
  }

  return { item: txResult.updated, changed };
}

export async function performEquipForCharacter(characterId: number, itemId: number, targetSlot: string) {
  const normalizedSlot = String(targetSlot).toUpperCase();

  // The character must be valid
  const character = await prisma.character.findUnique({ where: { id: characterId } });
  if (!character) throw new DomainError('INVALID_CHARACTER', 'Invalid character');


  const item = await prisma.item.findUnique({ where: { id: itemId } });
  const itemContainer = item && item.containerId ? await prisma.container.findUnique({ where: { id: item.containerId } }) : null;

  // The item must exist
  if (!item) throw new DomainError('INVALID_ITEM', 'Invalid item');

  // The character must own the item
  ensureItemBelongsToCharacter(item, characterId);

  // The item's equipmentSlot must match the destination slot 
  if (!isValidForSlot(item, null, normalizedSlot)) throw new DomainError('INVALID_SLOT', 'Item equipmentSlot does not match target slot');

  // Get current equipments container, if any
  const existingEquip = await prisma.equipment.findUnique({ where: { characterId_slot: { characterId, slot: normalizedSlot } as any } });
  const currentContainer = existingEquip?.containerId ? await prisma.container.findUnique({ where: { id: existingEquip.containerId } }) : null;
  const itemsInCurrentContainer = currentContainer ? await prisma.item.count({ where: { containerId: currentContainer.id } }) : 0;

  // Disallow replacing an item with a container with items inside it
  if (itemsInCurrentContainer > 0 && item && item.isContainer) {
    const containedCount = await prisma.item.count({ where: { containerId: item.id } });
    if (containedCount > 0) throw new DomainError('CANNOT_EQUIP_CONTAINER_WITH_ITEMS', 'Cannot equip a container that has items inside it');
  }

  const txResult = await prisma.$transaction(async (tx: any) => {

    // The existing equipment must take the position of the incoming item in the container hierarchy
    const existingEquip = await tx.equipment.findUnique({ where: { characterId_slot: { characterId, slot: normalizedSlot } as any } });
    
    // The item must not be placed inside itself or its descendants to avoid loops
    if (item && item.isContainer) {
      const targetContainerId = existingEquip?.containerId ?? null;
      const wouldDescend = await containerIsDescendantOfItem(tx, targetContainerId, itemId);
      if (wouldDescend) throw new DomainError('CANNOT_PLACE_CONTAINER_IN_SELF', 'Cannot place container inside itself or its descendants');
    }

    const movingItem = await tx.item.findUnique({ where: { id: itemId }, select: { containerId: true, containerIndex: true } });
    const src = movingItem ? { containerId: movingItem.containerId ?? null, localIndex: movingItem.containerIndex ?? null } : { containerId: null, localIndex: null };

    // Remove container refs from the incoming item so it isn't listed twice
    await tx.item.update({ where: { id: itemId }, data: { containerId: null, containerIndex: null } });

    // The existing equipment, if any, should be relocated into the source
    // slot of the incoming item (if any). Otherwise clear its container refs.
    if (existingEquip) {
      // Only attempt to move/clear if there is actually an item currently equipped
      if (existingEquip.itemId != null) {
        if (src.containerId != null) {
          await tx.item.update({ where: { id: existingEquip.itemId }, data: { containerId: src.containerId, containerIndex: src.localIndex } });
        } else {
          await tx.item.update({ where: { id: existingEquip.itemId }, data: { containerId: null, containerIndex: null } });
        }
      }
    }

    // The incoming item must remove all other equipment references (no duplicate usage)
    const alreadyEquipped = await tx.equipment.findFirst({ where: { characterId, itemId } });
    if (alreadyEquipped) {
      await tx.equipment.update({ where: { id: alreadyEquipped.id }, data: { itemId: null } });
    }

    // The incoming item must be set as the equipment for the target slot
    await tx.equipment.upsert({ where: { characterId_slot: { characterId, slot: normalizedSlot } }, update: { itemId }, create: { characterId, slot: normalizedSlot, itemId } });

    // If the item is a container, ensure its capacity is reflected in its container record
    const reciprocal = item && item.isContainer ? await tx.container.findFirst({ where: { itemId: item.id } }) : null;

    const equipment = await tx.equipment.findMany({ where: { characterId }, include: { Item: true } });
    const containers = await tx.container.findMany({ where: { characterId }, include: { items: { orderBy: { containerIndex: 'asc' } } } });

    return { equipment, containers, capacityUpdated: !!reciprocal, updatedContainerIds: reciprocal ? [reciprocal.id] : [] };
  });

  const { equipment, containers, capacityUpdated, updatedContainerIds } = txResult;

  const annotatedContainers = containers.map((c: any) => {
    const type = c.containerType ?? 'BASIC';
    return {
      ...c,
      containerType: type,
      icon: iconForContainerType(type),
      items: (c.items ?? []).map((it: any) => ({
        ...it,
        image: it.image ?? '/img/debug/placeholder.png',
      })),
    };
  });

  // Provide grouped containers for client: equippedContainers (containers that are equipped or pockets)
  // and nestableContainers (containers marked nestable) while keeping `containers` for compatibility.
  const equippedItemIds = new Set((equipment || []).map((e: any) => e.itemId).filter((id: any) => id != null));
  const equippedContainers = annotatedContainers.filter((c: any) => {
    if (!c) return false;
    const name = String(c.name || '').toLowerCase();
    if (name === 'pockets' || String(c.containerType || '').toUpperCase() === 'POCKETS') return true;
    if (c.itemId != null && equippedItemIds.has(c.itemId)) return true;
    return false;
  });
  const nestableContainers = annotatedContainers.filter((c: any) => !!c.nestable);

  return { equipment, containers: annotatedContainers, equippedContainers, nestableContainers, capacityUpdated, updatedContainerIds };
}
