
import express from 'express';
import prisma from '../lib/prisma.js';

const router = express.Router();

function ensureAuth(req, res, next) {
  if (!req.session || !req.session.passport || !req.session.passport.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
}

// body: { characterId, itemId, targetSlot }
router.post('/equip', ensureAuth, async (req, res) => {
  const userId = req.session.passport.user.id || req.session.passport.user;
  const { characterId, itemId, targetSlot } = req.body || {};
  if (!characterId || !itemId || !targetSlot) return res.status(400).json({ error: 'Missing parameters' });

  try {
    // Validate character belongs to user
    const character = await prisma.character.findUnique({ where: { id: characterId } });
    if (!character || character.userId !== userId) return res.status(403).json({ error: 'Invalid character' });

    // Fetch item and ensure ownership
    const item = await prisma.item.findUnique({ where: { id: itemId } });
    if (!item || item.characterId !== characterId) return res.status(403).json({ error: 'Invalid item or not owned by character' });

    // If item is a container, find its Container record
    const newContainer = await prisma.container.findFirst({ where: { itemId: itemId } });

    // Find currently equipped item in that slot
    let currentEquip = null;
    try {
      currentEquip = await prisma.equipment.findUnique({ where: { characterId_slot: { characterId, slot: targetSlot } } });
    } catch (e) {
      currentEquip = null;
    }
    const oldItemId = currentEquip ? currentEquip.itemId : null;
    let oldContainer = null;
    if (oldItemId) {
      oldContainer = await prisma.container.findFirst({ where: { itemId: oldItemId } });
    }

    // If replacing a container with items, ensure capacity
    if (oldContainer && newContainer) {
      const itemCount = await prisma.item.count({ where: { containerId: oldContainer.id } });
      const newCap = newContainer.capacity || 0;
      if (newCap < itemCount) {
        return res.status(400).json({ error: 'Insufficient capacity on new container', needed: itemCount, capacity: newCap });
      }

      // perform move and update equipment atomically
      await prisma.$transaction([
        prisma.item.updateMany({ where: { containerId: oldContainer.id }, data: { containerId: newContainer.id } }),
        prisma.equipment.upsert({
          where: { characterId_slot: { characterId, slot: targetSlot } },
          update: { itemId },
          create: { characterId, slot: targetSlot, itemId }
        })
      ]);

      // return canonical state
      const containers = await prisma.container.findMany({ where: { id: { in: [oldContainer.id, newContainer.id] } }, include: { items: true } });
      const equipment = await prisma.equipment.findMany({ where: { characterId } });
      return res.json({ success: true, containers, equipment });
    }

    // Non-container or simple equip: just upsert equipment
    await prisma.equipment.upsert({
      where: { characterId_slot: { characterId, slot: targetSlot } },
      update: { itemId },
      create: { characterId, slot: targetSlot, itemId }
    });

    const equipment = await prisma.equipment.findMany({ where: { characterId } });
    return res.json({ success: true, equipment });

  } catch (err) {
    console.error('Equip error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
