import { prisma } from '../../db/prisma';
import { mapItemForClient, makePocketsPlaceholder } from './character.domain';

export async function buildCharacterWithEquipment(character: any) {
  // ...existing code...

  let equipmentRows: any[] = [];
  try {
    equipmentRows = await prisma.equipment.findMany({ where: { characterId: character.id }, include: { Item: true } });
  } catch (e) {
    console.warn('buildCharacterWithEquipment: could not load equipment rows', (e as any)?.code);
    equipmentRows = [];
  }

  const equipped: Record<string, any> = {};

  equipmentRows.forEach((r) => {
    const key = String(r.slot).toLowerCase();
    equipped[key] = mapItemForClient(r.Item) || null;
  });

  try {
    const pockets = await prisma.container.findFirst({ where: { characterId: character.id, name: 'Pockets' } });
    if (pockets) {
      let pocketItem = null;
      if (pockets.itemId) {
        try {
          const it = await prisma.item.findUnique({ where: { id: pockets.itemId } });
          pocketItem = mapItemForClient(it);
        } catch (e) {
          console.warn('buildCharacterWithEquipment: failed to load item for pockets', (e as any)?.code);
        }
      }
      if (!pocketItem) {
        pocketItem = makePocketsPlaceholder(pockets);
      }
      equipped.pocket = pocketItem;
    } else {
      equipped.pocket = null;
    }
  } catch (e) {
    console.warn('buildCharacterWithEquipment: error finding pockets container', e);
    equipped.pocket = null;
  }

  return { ...character, equipped };
}

export async function getContainersForCharacter(characterId: number) {
  let containers: any[] = [];
  try {
    containers = await prisma.container.findMany({ where: { characterId }, include: { items: { orderBy: { containerIndex: 'asc' } } } });
    containers = containers.map((c: any) => ({
      ...c,
      containerType: c.containerType || 'BASIC',
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
  } catch (e) {
    console.warn('getContainersForCharacter: could not fetch containers for character', (e as any)?.code);
  }
  return containers;
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
