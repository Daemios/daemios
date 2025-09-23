import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding DEBUG_TINY items into containers...');

  const fallbackCharacter = await prisma.character.findFirst({ orderBy: { id: 'asc' } });
  if (!fallbackCharacter) {
    console.log('No characters found in DB. Containers without characterId will be skipped.');
  } else {
    console.log(`Fallback character id: ${fallbackCharacter.id}`);
  }

  const containers = await prisma.container.findMany();
  console.log(`Found ${containers.length} containers`);

  let inserted = 0;
  for (const c of containers) {
    const ownerId = c.characterId ?? (fallbackCharacter && fallbackCharacter.id) ?? null;
    if (!ownerId) {
      console.log(`Skipping container ${c.id} (${c.name}) - no character owner and no fallback available`);
      continue;
    }

    const exists = await prisma.item.findFirst({ where: { containerId: c.id, name: 'DEBUG_TINY' } });
    if (exists) {
      console.log(`Container ${c.id} already has DEBUG_TINY, skipping`);
      continue;
    }

    const agg = await prisma.item.aggregate({
      where: { containerId: c.id, containerIndex: { not: null } },
      _max: { containerIndex: true },
    });
    const maxIndex = agg._max && typeof agg._max.containerIndex === 'number' ? agg._max.containerIndex : null;
    const newIndex = maxIndex !== null ? maxIndex + 1 : 0;

    await prisma.item.create({
      data: {
        name: 'DEBUG_TINY',
        locationId: null,
        containerId: c.id,
        characterId: ownerId,
        createdBy: null,
        createdOn: new Date(),
        description: 'Seeded tiny debug item',
        image: null,
        itemEffectId: null,
        itemTypeId: null,
        lastUpdate: Math.floor(Date.now() / 1000),
        quantity: 1,
        containerIndex: newIndex,
      }
    });
    console.log(`Inserted DEBUG_TINY into container ${c.id} (new containerIndex: ${newIndex})`);
    inserted++;
  }

  console.log(`Seed complete. Inserted: ${inserted}`);
}

main()
  .catch((e) => {
    console.error('Seeding failed', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
