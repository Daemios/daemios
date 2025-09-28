const { prisma } = require('../src/db/prisma');

async function run() {
  try {
    const r = await prisma.container.findMany({ where: { characterId: 1 }, include: { items: { orderBy: { containerIndex: 'asc' } } } });
    console.log('PRISMA_OK', Array.isArray(r) ? r.length : '?');
  } catch (e) {
    console.error('PRISMA_ERROR', e.code, e.message, e.meta ? JSON.stringify(e.meta) : undefined);
    process.exit(2);
  } finally {
    await prisma.$disconnect();
  }
}

run();
