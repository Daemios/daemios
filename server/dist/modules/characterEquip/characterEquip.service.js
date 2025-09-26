import { prisma } from '../../db/prisma';
export async function equipItemToCharacter(characterId, itemId, slot) {
    // Ensure item exists and belongs to character
    const item = await prisma.item.findUnique({ where: { id: itemId } });
    if (!item)
        throw Object.assign(new Error('Item not found'), { status: 404 });
    if (item.characterId !== characterId)
        throw Object.assign(new Error('Item does not belong to character'), { status: 403 });
    // Upsert equipment for slot
    const upserted = await prisma.equipment.upsert({
        where: { characterId_slot: { characterId, slot } },
        create: { characterId, slot, itemId },
        update: { itemId },
    });
    return upserted;
}
export async function unequipItemFromSlot(characterId, slot) {
    const existing = await prisma.equipment.findUnique({ where: { characterId_slot: { characterId, slot } } });
    if (!existing)
        return null;
    await prisma.equipment.delete({ where: { id: existing.id } });
    return existing;
}
export async function listEquipmentForCharacter(characterId) {
    return prisma.equipment.findMany({ where: { characterId }, include: { Item: true } });
}
