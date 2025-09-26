import { prisma } from '../../db/prisma';
import { EquipmentSlot } from '@prisma/client';
import { ensureItemBelongsToCharacter, DomainError } from './characterEquip.domain';

export async function equipItemToCharacter(characterId: number, itemId: number, slot: EquipmentSlot) {
  // Ensure item exists and belongs to character (domain validation)
  const item = await prisma.item.findUnique({ where: { id: itemId } });
  try {
    ensureItemBelongsToCharacter(item, characterId);
  } catch (e: any) {
    if (e instanceof DomainError) {
      if (e.code === 'ITEM_NOT_FOUND') throw Object.assign(new Error(e.message), { status: 404 });
      if (e.code === 'ITEM_NOT_OWNED') throw Object.assign(new Error(e.message), { status: 403 });
    }
    throw e;
  }

  // Upsert equipment for slot
  const upserted = await prisma.equipment.upsert({
    where: { characterId_slot: { characterId, slot } as any },
    create: { characterId, slot, itemId },
    update: { itemId },
  });
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
