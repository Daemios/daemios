import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const sqlPath = path.join(__dirname, 'seed_add_debug_items.sql');
  let contents;
  try {
    contents = fs.readFileSync(sqlPath, 'utf8');
  } catch (err) {
    console.error('Unable to read seed_add_debug_items.sql at', sqlPath, err);
    process.exit(1);
  }

  try {
    console.log('Executing SQL seed...');
    // Prisma's $executeRawUnsafe can execute multiple statements if the connector supports it
    const res = await prisma.$executeRawUnsafe(contents);
    console.log('SQL executed, result:', res);
  } catch (err) {
    console.error('SQL execution failed', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
