import { prisma } from '../../../db/prisma';
import characters from '../../../lib/characters';
export async function buildCharacterWithEquipment(character) {
    function mapItemForClient(it) {
        if (!it)
            return null;
        const img = it.image || it.img || '/img/debug/placeholder.png';
        return { ...it, img, label: it.label || it.name || (it.displayName || null) };
    }
    let equipmentRows = [];
    try {
        equipmentRows = await prisma.equipment.findMany({ where: { characterId: character.id }, include: { Item: true } });
    }
    catch (e) {
        console.warn('buildCharacterWithEquipment: could not load equipment rows', e?.code);
        equipmentRows = [];
    }
    const equipped = {};
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
                }
                catch (e) {
                    console.warn('buildCharacterWithEquipment: failed to load item for pockets', e?.code);
                }
            }
            if (!pocketItem) {
                pocketItem = { id: null, label: 'Pockets', img: null, isContainer: true, containerId: pockets.id, capacity: pockets.capacity || 0 };
            }
            equipped.pocket = pocketItem;
        }
        else {
            equipped.pocket = null;
        }
    }
    catch (e) {
        console.warn('buildCharacterWithEquipment: error finding pockets container', e);
        equipped.pocket = null;
    }
    return { ...character, equipped };
}
export const characterService = {
    async getActiveCharacterForUser(userId) {
        return characters.getActiveCharacter(userId);
    },
    async deactivateCharacters(userId) {
        return characters.deactivateCharacters(userId);
    },
    async activateCharacter(userId, characterId) {
        return characters.activateCharacter(userId, characterId);
    },
    async createCharacterForUser(userId, payload) {
        const { name, raceId, image } = payload;
        const data = { user: { connect: { id: userId } } };
        if (name != null)
            data.name = name;
        if (image != null)
            data.image = image;
        if (raceId != null)
            data.race = { connect: { id: raceId } };
        const createdChar = await prisma.character.create({ data });
        try {
            if (createdChar && createdChar.id) {
                await prisma.container.create({ data: { name: 'Pockets', capacity: 6, characterId: createdChar.id, removable: true, containerType: 'POCKETS' } });
            }
        }
        catch (e) {
            console.warn('Failed to create pockets container for new character', e?.code);
        }
        return createdChar;
    },
    async listCharactersForUser(userId) {
        return prisma.character.findMany({ where: { userId } });
    },
};
