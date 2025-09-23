import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
(async () => {
  try {
    const db = (process.env.DATABASE_URL || '').split('/').pop().split('?')[0];
    console.log('DB schema:', db);

    // Find foreign keys referencing Structure
    const fks = await prisma.$queryRawUnsafe(
      `SELECT CONSTRAINT_NAME, TABLE_NAME, COLUMN_NAME
       FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
       WHERE REFERENCED_TABLE_SCHEMA = ? AND REFERENCED_TABLE_NAME = 'Structure'`, db
    );
    console.log('Foreign keys referencing Structure:');
    console.table(fks);

    // Drop each foreign key constraint
    for (const fk of fks) {
      const table = fk.TABLE_NAME;
      const constraint = fk.CONSTRAINT_NAME;
      try {
        console.log(`Dropping foreign key ${constraint} on table ${table}`);
        await prisma.$executeRawUnsafe(`ALTER TABLE \`${table}\` DROP FOREIGN KEY \`${constraint}\``);
      } catch (e) {
        console.error(`Failed to drop FK ${constraint} on ${table}:`, e.message);
      }
    }

    // Drop indexes that reference structureId (if exist)
    const idxs = await prisma.$queryRawUnsafe(
      `SELECT INDEX_NAME, TABLE_NAME FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = ? AND COLUMN_NAME = 'structureId'`, db
    );
    if (idxs && idxs.length) {
      console.log('Indexes on structureId:');
      console.table(idxs);
      for (const idx of idxs) {
        try {
          console.log(`Dropping index ${idx.INDEX_NAME} on ${idx.TABLE_NAME}`);
          await prisma.$executeRawUnsafe(`ALTER TABLE \`${idx.TABLE_NAME}\` DROP INDEX \`${idx.INDEX_NAME}\``);
        } catch (e) {
          console.error(`Failed to drop index ${idx.INDEX_NAME} on ${idx.TABLE_NAME}:`, e.message);
        }
      }
    } else {
      console.log('No indexes on structureId found.');
    }

    // Drop structureId columns if present
    const tables = ['Item','Entity','Container'];
    for (const t of tables) {
      const res = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = 'structureId'`, db, t);
      if (res && res[0] && res[0].cnt > 0) {
        try {
          console.log(`Dropping column structureId from ${t}`);
          await prisma.$executeRawUnsafe(`ALTER TABLE \`${t}\` DROP COLUMN structureId`);
        } catch (e) {
          console.error(`Failed to drop column structureId from ${t}:`, e.message);
        }
      } else {
        console.log(`No structureId column on ${t}`);
      }
    }

    // Drop Structure table
    const structExists = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'Structure'`, db);
    if (structExists && structExists[0] && structExists[0].cnt > 0) {
      try {
        console.log('Dropping Structure table');
        await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS Structure');
      } catch (e) {
        console.error('Failed to drop Structure table:', e.message);
      }
    } else {
      console.log('Structure table not present');
    }

    console.log('Completed dropping Structure FKs/columns/table.');
  } catch (err) {
    console.error('Error:', err.message || err);
  } finally {
    await prisma.$disconnect();
  }
})();