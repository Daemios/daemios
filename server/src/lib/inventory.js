import prisma from './prisma.js';

const DEFAULT_CONTAINERS = [
  {
    templateKey: 'starter-backpack',
    name: 'Adventurer Backpack',
    capacity: 12,
    description: 'A well-loved leather pack with enough room for a fledgling hero\'s essentials.',
    allowedItemTags: null,
  },
  {
    templateKey: 'potion-belt',
    name: 'Potion Belt',
    capacity: 4,
    description: 'Specialized loops designed to keep restorative draughts within easy reach.',
    allowedItemTags: ['potion'],
  },
];

function normalizeTemplateKey(key) {
  return key || null;
}

async function ensureCharacterContainers(characterId) {
  if (!characterId) return [];

  const existing = await prisma.container.findMany({
    where: { characterId },
    select: { id: true, templateKey: true },
  });

  const existingKeys = new Set(
    existing
      .map((container) => normalizeTemplateKey(container.templateKey))
      .filter(Boolean),
  );

  const creations = DEFAULT_CONTAINERS
    .filter((container) => container.templateKey && !existingKeys.has(container.templateKey))
    .map((template) =>
      prisma.container.create({
        data: {
          templateKey: template.templateKey,
          name: template.name,
          capacity: template.capacity,
          description: template.description,
          allowedItemTags: template.allowedItemTags ?? undefined,
          character: { connect: { id: characterId } },
        },
      }),
    );

  if (creations.length > 0) await Promise.all(creations);

  return prisma.container.findMany({
    where: { characterId },
    include: {
      items: {
        include: { itemType: true },
        orderBy: [
          { slotIndex: 'asc' },
          { id: 'asc' },
        ],
      },
    },
    orderBy: [
      { templateKey: 'asc' },
      { name: 'asc' },
    ],
  });
}

async function getCharacterContainers(characterId) {
  if (!characterId) return [];

  return prisma.container.findMany({
    where: { characterId },
    include: {
      items: {
        include: { itemType: true },
        orderBy: [
          { slotIndex: 'asc' },
          { id: 'asc' },
        ],
      },
    },
    orderBy: [
      { templateKey: 'asc' },
      { name: 'asc' },
    ],
  });
}

export default {
  ensureCharacterContainers,
  getCharacterContainers,
};
