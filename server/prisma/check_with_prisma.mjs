import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
(async () => {
  const db = (process.env.DATABASE_URL || '').split('/').pop().split('?')[0];
  const rows = await prisma.$queryRawUnsafe(`SELECT TABLE_NAME, COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND (COLUMN_NAME LIKE '%structure%' OR COLUMN_NAME = 'characterId' OR COLUMN_NAME = 'removable' OR COLUMN_NAME = 'containerIndex')`, db);
  console.table(rows);
  await prisma.$disconnect();
})();