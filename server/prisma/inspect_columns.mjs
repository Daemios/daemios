import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
(async () => {
  const db = (process.env.DATABASE_URL || '').split('/').pop().split('?')[0];
  const tables = ['Item','Container','Entity','Structure'];
  for (const t of tables) {
    const rows = await prisma.$queryRawUnsafe(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`, db, t);
    console.log('---', t, '---');
    console.table(rows.map(r => r.COLUMN_NAME));
  }
  await prisma.$disconnect();
})();