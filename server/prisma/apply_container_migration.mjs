import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function exists(query, params) {
  const res = await prisma.$queryRawUnsafe(query, ...params);
  return res && res[0] && Object.values(res[0])[0] > 0;
}

async function columnExists(table, column) {
  const q = `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`;
  const db = (process.env.DATABASE_URL || '').split('/').pop().split('?')[0];
  const res = await prisma.$queryRawUnsafe(q, db, table, column);
  return res && res[0] && res[0].cnt > 0;
}

async function tableExists(table) {
  const q = `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`;
  const db = (process.env.DATABASE_URL || '').split('/').pop().split('?')[0];
  const res = await prisma.$queryRawUnsafe(q, db, table);
  return res && res[0] && res[0].cnt > 0;
}

async function indexExists(table, indexName) {
  const q = `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ?`;
  const db = (process.env.DATABASE_URL || '').split('/').pop().split('?')[0];
  const res = await prisma.$queryRawUnsafe(q, db, table, indexName);
  return res && res[0] && res[0].cnt > 0;
}

(async () => {
  try {
    console.log('Starting guarded migration on DB from', process.env.DATABASE_URL);
    const db = (process.env.DATABASE_URL || '').split('/').pop().split('?')[0];

    // 1) Structure backup
    const structPresent = await tableExists('Structure');
    if (structPresent) {
      console.log('Structure table exists. Row count:');
      const rc = await prisma.$queryRawUnsafe('SELECT COUNT(*) AS cnt FROM Structure');
      console.table(rc);
      const backupExists = await tableExists('Structure_backup');
      if (!backupExists) {
        console.log('Creating Structure_backup from Structure...');
        await prisma.$executeRawUnsafe('CREATE TABLE Structure_backup AS SELECT * FROM Structure');
        const rc2 = await prisma.$queryRawUnsafe('SELECT COUNT(*) AS cnt FROM Structure_backup');
        console.log('Backup row count:');
        console.table(rc2);
      } else {
        console.log('Structure_backup already exists; skipping backup creation.');
      }
    } else {
      console.log('No Structure table present.');
    }

    // 2) Add missing columns
    if (!await columnExists('Item','containerIndex')) {
      console.log('Adding Item.containerIndex column...');
      await prisma.$executeRawUnsafe('ALTER TABLE Item ADD COLUMN containerIndex INT NULL');
    } else console.log('Item.containerIndex already exists');

    if (!await columnExists('Container','characterId')) {
      console.log('Adding Container.characterId column...');
      await prisma.$executeRawUnsafe('ALTER TABLE Container ADD COLUMN characterId INT NULL');
    } else console.log('Container.characterId already exists');

    if (!await columnExists('Container','removable')) {
      console.log('Adding Container.removable column...');
      await prisma.$executeRawUnsafe("ALTER TABLE Container ADD COLUMN removable BOOLEAN NOT NULL DEFAULT TRUE");
    } else console.log('Container.removable already exists');

    // 3) Create supporting indexes if missing
    if (!await indexExists('Item','Item_containerId_idx')) {
      console.log('Creating index Item_containerId_idx...');
      try { await prisma.$executeRawUnsafe('CREATE INDEX Item_containerId_idx ON Item(containerId)'); } catch(e){ console.error('Index create error (non-fatal):', e.message); }
    } else console.log('Item_containerId_idx already exists');

    if (!await indexExists('Container','Container_characterId_idx')) {
      console.log('Creating index Container_characterId_idx...');
      try { await prisma.$executeRawUnsafe('CREATE INDEX Container_characterId_idx ON Container(characterId)'); } catch(e){ console.error('Index create error (non-fatal):', e.message); }
    } else console.log('Container_characterId_idx already exists');

    // 4) Resolve duplicates for (containerId, containerIndex)
    console.log('Checking for duplicate (containerId,containerIndex) entries...');
    const dup = await prisma.$queryRawUnsafe(`
      SELECT containerId, containerIndex, COUNT(*) as c
      FROM Item
      WHERE containerId IS NOT NULL AND containerIndex IS NOT NULL
      GROUP BY containerId, containerIndex
      HAVING c > 1
      LIMIT 1000
    `);
    if (dup && dup.length > 0) {
      console.log('Found duplicates. For each duplicate slot, clearing containerIndex on excess rows (keeping one).');
      for (const row of dup) {
        const cid = row.containerId;
        const cidx = row.containerIndex;
        console.log('Resolving duplicates for containerId=', cid, 'containerIndex=', cidx);
        const rows = await prisma.$queryRawUnsafe('SELECT id FROM Item WHERE containerId = ? AND containerIndex = ? ORDER BY id', cid, cidx);
        if (rows.length > 1) {
          // keep first, null out others
          for (let i=1;i<rows.length;i++) {
            const id = rows[i].id;
            await prisma.$executeRawUnsafe('UPDATE Item SET containerIndex = NULL WHERE id = ?', id);
            console.log('Cleared containerIndex for Item id', id);
          }
        }
      }
    } else {
      console.log('No duplicates detected.');
    }

    // 5) Create unique index
    if (!await indexExists('Item','Item_containerId_containerIndex_key')) {
      try {
        console.log('Creating unique index on (containerId, containerIndex)...');
        await prisma.$executeRawUnsafe('ALTER TABLE Item ADD UNIQUE INDEX Item_containerId_containerIndex_key (containerId, containerIndex)');
        console.log('Unique index created.');
      } catch (e) {
        console.error('Failed to create unique index:', e.message);
        console.error('You need to resolve duplicates before creating the unique index.');
      }
    } else console.log('Unique index already exists');

    // 6) Drop structure columns and table (only if exists)
    if (structPresent) {
      console.log('Dropping structureId columns from Item, Entity, Container if present...');
      if (await columnExists('Item','structureId')) {
        try { await prisma.$executeRawUnsafe('ALTER TABLE Item DROP COLUMN structureId'); console.log('Dropped Item.structureId'); } catch(e){ console.error('Error dropping Item.structureId:', e.message); }
      }
      if (await columnExists('Entity','structureId')) {
        try { await prisma.$executeRawUnsafe('ALTER TABLE Entity DROP COLUMN structureId'); console.log('Dropped Entity.structureId'); } catch(e){ console.error('Error dropping Entity.structureId:', e.message); }
      }
      if (await columnExists('Container','structureId')) {
        try { await prisma.$executeRawUnsafe('ALTER TABLE Container DROP COLUMN structureId'); console.log('Dropped Container.structureId'); } catch(e){ console.error('Error dropping Container.structureId:', e.message); }
      }
      // drop Structure table
      try { await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS Structure'); console.log('Dropped Structure table'); } catch(e){ console.error('Error dropping Structure table:', e.message); }
    } else {
      console.log('No Structure cleanup required');
    }

    console.log('Guarded migration complete.');

  } catch (err) {
    console.error('Migration script error:', err);
  } finally {
    await prisma.$disconnect();
  }
})();
