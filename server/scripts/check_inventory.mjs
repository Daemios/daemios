import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  const itemId = 7;
  const userId = 7;
  console.log('Inspecting DB for itemId=', itemId, 'and userId=', userId);

  const item = await prisma.item.findUnique({ where: { id: itemId } });
  console.log('item:', item);

  const container1 = await prisma.container.findUnique({ where: { id: 1 } });
  const container2 = await prisma.container.findUnique({ where: { id: 2 } });
  console.log('container 1:', container1);
  console.log('container 2:', container2);

  const character = await prisma.character.findFirst({ where: { userId }, orderBy: { id: 'asc' } });
  console.log('character for user:', character);

  // show any item occupying container2 index 4
  const occupied = await prisma.item.findFirst({ where: { containerId: 2, containerIndex: 4 } });
  console.log('occupied at container 2 index 4:', occupied);
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
