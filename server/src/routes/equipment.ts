import express from 'express';
import { characterService } from '../modules/character/character.service';
import { performEquipForCharacter } from '../modules/equipment/equipment.service';
import { DomainError } from '../modules/equipment/equipment.domain';
import { EquipmentSlot as PrismaEquipmentSlot } from '@prisma/client';

const router = express.Router();

// Ensure this router's routes are explicitly protected by the shared middleware.
// The app also mounts `isAuth` globally, but using it here makes the requirement
// explicit and avoids in-route session checks.
router.post('/equip', async (req: express.Request, res: express.Response) => {
  const { itemId, slot } = req.body || {};

  // Resolve user -> active character. Require Passport's `req.user`.
  const rawUserId = req.user && req.user.id ? req.user.id : null;
  if (!rawUserId) return res.status(401).json({ error: 'Not authenticated' });
  const userId = Number(rawUserId);

  let characterId: number | null = null;
  try {
  const character = await characterService.getActiveCharacterForUser(userId);
    if (character && character.id) characterId = character.id;
  } catch (err) {
    console.warn('equipment: failed to resolve active character from session', err && (err as any).code);
  }

  if (!itemId || !slot) {
    return res.status(400).json({ error: 'Missing parameters: itemId and slot are required' });
  }
  if (!characterId) return res.status(404).json({ error: 'No active character found for session' });

  const normalizedSlot = String(slot).toUpperCase();
  const allowedSlots = Object.values(PrismaEquipmentSlot).map((s) => String(s).toUpperCase());
  if (!allowedSlots.includes(normalizedSlot)) {
    return res.status(400).json({ error: 'Invalid slot value', detail: `slot must be one of: ${allowedSlots.join(', ')}` });
  }

  try {
    const result = await performEquipForCharacter(characterId, itemId, normalizedSlot);
    return res.json({ success: true, ...result });
  } catch (e: any) {
    if (e instanceof DomainError) {
      switch (e.code) {
        case 'ITEM_NOT_FOUND': return res.status(404).json({ error: e.message, code: e.code });
        case 'ITEM_NOT_OWNED': return res.status(403).json({ error: e.message, code: e.code });
        case 'INVALID_SLOT':
        case 'INVALID_ITEM_FOR_SLOT':
        case 'CONTAINER_RECORD_NOT_FOUND':
        case 'CONTAINER_RECORD_NOT_FOUND_TX':
        case 'CONTAINER_CAPACITY_UNKNOWN':
        case 'CONTAINER_OVERFLOW':
        case 'POCKETS_FULL':
        case 'SOURCE_CONTAINER_FULL':
        case 'SOURCE_INDEX_OCCUPIED':
        case 'NO_POCKETS':
        case 'CANNOT_PLACE_CONTAINER_IN_SELF':
          return res.status(400).json({ error: e.message, code: e.code });
        default:
          return res.status(400).json({ error: e.message, code: e.code });
      }
    }
    console.error('Equip error', e);
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
