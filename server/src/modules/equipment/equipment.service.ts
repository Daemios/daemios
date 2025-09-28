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

    // The item must remove any container reference so it is not also listed in a container
    await tx.item.update({ where: { id: itemId }, data: { containerId: null, containerIndex: null } });

    // The existing equipment, if any, must have its item removed
    if (existingEquip) {
      await tx.item.update({ where: { id: existingEquip.itemId }, data: { containerId: null, containerIndex: null } });
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

  return { equipment, containers: annotatedContainers, capacityUpdated, updatedContainerIds };
}
