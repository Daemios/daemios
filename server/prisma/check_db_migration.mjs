import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
(async () => {
  try {
    const db = (process.env.DATABASE_URL || '').split('/').pop().split('?')[0];
    console.log('DB schema:', db);

    console.log('\n1) Check existence of key columns:');
    const cols = await prisma.$queryRawUnsafe(`
      SELECT TABLE_NAME, COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND COLUMN_NAME IN ('containerIndex','removable','characterId','structureId')
    `, db);
    console.table(cols);

    console.log('\n2) Check duplicates for (containerId, containerIndex)');
    const dup = await prisma.$queryRawUnsafe(`
      SELECT containerId, containerIndex, COUNT(*) as c
      FROM Item
      WHERE containerId IS NOT NULL AND containerIndex IS NOT NULL
      GROUP BY containerId, containerIndex
      HAVING c > 1
      LIMIT 100;
    `);
    console.table(dup);

    console.log('\n3) Structure table row count (if exists)');
    const structExists = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'Structure'
    `, db);
    if (structExists && structExists[0] && structExists[0].cnt > 0) {
      const rc = await prisma.$queryRawUnsafe(`SELECT COUNT(*) AS cnt FROM Structure`);
      console.table(rc);
    } else {
      console.log('Structure table not present');
    }

    // show a few sample rows from Container and Item to inspect
    console.log('\n4) Sample rows (Container, Item)');
    const containers = await prisma.$queryRawUnsafe(`SELECT id, name, capacity, locationId, characterId, removable FROM Container LIMIT 10`);
    console.table(containers);
    const items = await prisma.$queryRawUnsafe(`SELECT id, name, containerId, containerIndex, characterId FROM Item LIMIT 20`);
    console.table(items);

  } catch (e) {
    console.error('Error:', e.message || e);
  } finally {
    await prisma.$disconnect();
  }
})();