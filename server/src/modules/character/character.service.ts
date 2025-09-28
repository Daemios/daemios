import { prisma } from '../../db/prisma';
import { mapItemForClient, makePocketsPlaceholder } from './character.domain';

// Build character payload with equipped items mapped for client consumption
export async function buildCharacterWithEquipment(character: any) {
  const equipmentRows: any[] = await prisma.equipment.findMany({ where: { characterId: character.id }, include: { Item: true } });

  const equipped: Record<string, any> = {};
  equipmentRows.forEach((r: any) => {
    const key = String(r.slot).toLowerCase();
    equipped[key] = mapItemForClient(r.Item) || null;
  });

  const pockets = await prisma.container.findFirst({ where: { characterId: character.id, name: 'Pockets' } });
  if (pockets) {
    const pocketItem = pockets.itemId ? mapItemForClient(await prisma.item.findUnique({ where: { id: pockets.itemId } })) : makePocketsPlaceholder(pockets);
    equipped.pocket = pocketItem;
  } else {
    equipped.pocket = null;
  }

  return { ...character, equipped };
}

// Fetch containers for character and map items/icons for client
export async function getContainersForCharacter(characterId: number) {
  const containers = await prisma.container.findMany({ where: { characterId }, include: { items: { orderBy: { containerIndex: 'asc' } } } });
  return containers.map((c: any) => ({
    ...c,
    containerType: c.containerType || 'BASIC',
    // TODO(cleanup): reuse inventory/equipment icon mapping instead of duplicating switch logic here.
    icon: ((tpe: any) => {
      const tstr = String(tpe || 'BASIC').toUpperCase();
      switch (tstr) {
        case 'LIQUID': return 'water';
        case 'CONSUMABLES': return 'food-apple';
        case 'PACK': return 'backpack';
        case 'POCKETS': return 'hand';
        default: return null;
      }
    })(c.containerType),
    items: (c.items || []).map((it: any) => ({ ...it, img: it.image || it.img || '/img/debug/placeholder.png', label: it.label || it.name || null })),
  }));
}

export const characterService = {
  async getActiveCharacterForUser(userId: number) {
    return prisma.character.findFirst({
      where: { user: { id: userId }, active: true },
      include: { race: true },
    });
  },
  async deactivateCharacters(userId: number) {
    return prisma.character.updateMany({ where: { user: { id: userId } }, data: { active: false } });
  },
  async activateCharacter(userId: number, characterId: number) {
    return prisma.character.updateMany({ where: { user: { id: userId }, id: characterId }, data: { active: true } });
  },
  async createCharacterForUser(userId: number, payload: { name?: string; raceId?: number; image?: string }) {
    const { name, raceId, image } = payload;
    const data: any = { user: { connect: { id: userId } } };
    if (name != null) data.name = name;
    if (image != null) data.image = image;
    if (raceId != null) data.race = { connect: { id: raceId } };
    const createdChar = await prisma.character.create({ data });
    try {
      if (createdChar && createdChar.id) {
        await prisma.container.create({ data: { name: 'Pockets', capacity: 6, characterId: createdChar.id, removable: true, containerType: 'POCKETS' } });
      }
    } catch (e) {
      console.warn('Failed to create pockets container for new character', (e as any)?.code);
    }
    return createdChar;
  },
  async listCharactersForUser(userId: number) {
    return prisma.character.findMany({ where: { userId } });
  },
  buildCharacterWithEquipment,
  getContainersForCharacter,
};
