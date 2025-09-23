import prisma from './prisma.js';
import inventory from './inventory.js';

const characters = {
  getActiveCharacter: async (userId) => {
    const character = await prisma.character.findFirst({
      where: {
        user: {
          id: userId,
        },
        active: true,
      },
      include: {
        race: true,
        inventory: {
          include: {
            itemType: true,
          },
        },
      },
    });

    if (!character || !character.id) return character;

    const containers = await inventory.ensureCharacterContainers(character.id);

    return {
      ...character,
      containers,
    };
  },
  activateCharacter: async (userId, characterId) => prisma.character.updateMany({
    where: {
      user: {
        id: userId,
      },
      id: characterId,
    },
    data: {
      active: true,
    },
  }),
  deactivateCharacters: async (userId) => prisma.character.updateMany({
    where: {
      user: {
        id: userId,
      },
    },
    data: { active: false },
  }),
};

export default characters;
