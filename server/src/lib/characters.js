import prisma from './prisma.js';

const characters = {
  getActiveCharacter: async (userId) => prisma.character.findFirst({
    where: {
      user: {
        id: userId,
      },
      active: true,
    },
    include: {
      race: true, // Assuming 'race' is the relation field in your Prisma schema
    },
  }),
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
