import { prisma } from '../db/prisma';
export const characters = {
    getActiveCharacter: async (userId) => prisma.character.findFirst({
        where: { user: { id: userId }, active: true },
        include: { race: true },
    }),
    activateCharacter: async (userId, characterId) => prisma.character.updateMany({
        where: { user: { id: userId }, id: characterId },
        data: { active: true },
    }),
    deactivateCharacters: async (userId) => prisma.character.updateMany({
        where: { user: { id: userId } },
        data: { active: false },
    }),
};
export default characters;
