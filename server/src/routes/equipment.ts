import express from 'express';
import { characterService } from '../modules/character/character.service';
import { performEquipForCharacter } from '../modules/equipment/equipment.service';
import { DomainError } from '../modules/equipment/equipment.domain';
import { EquipmentSlot as PrismaEquipmentSlot } from '@prisma/client';

const router = express.Router();

function ensureAuth(req: any, res: any, next: any) {
  if (!req.session || !req.session.passport || !req.session.passport.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
}

// helper functions moved to service

router.post('/equip', ensureAuth, async (req: any, res: any) => {
  let userId: any = null;
  if (req.session && req.session.passport && req.session.passport.user) {
    const puser = req.session.passport.user;
    userId = (puser && puser.id) ? puser.id : puser;
  }
  const { characterId: bodyCharacterId, itemId: bodyItemId, item, targetSlot, slot } = req.body || {};
  // debug: log incoming payload to help trace missing params in client requests
  // eslint-disable-next-line no-console
  console.debug('equip request body:', { itemId: bodyItemId ?? (item && item.id), slot });
  // support multiple client shapes: { itemId } or { item: { id } }
  const itemId = bodyItemId ?? (item && item.id);
  const desiredSlot = targetSlot || slot;
  let characterId = bodyCharacterId;
  try {
    if (!characterId) {
      const character = await characterService.getActiveCharacterForUser(userId);
      if (character && character.id) characterId = character.id;
    }
  } catch (e) {
    console.warn('equipment: failed to resolve active character from session', e && (e as any).code);
  }
  if (!itemId || !desiredSlot) return res.status(400).json({ error: 'Missing parameters: itemId and targetSlot/slot are required' });
  if (!characterId) return res.status(404).json({ error: 'No active character found for session' });
  const normalizedSlot = String(desiredSlot).toUpperCase();
  // Validate slot is exactly one of the Prisma EquipmentSlot values.
  const allowedSlots = Object.values(PrismaEquipmentSlot).map((s) => String(s).toUpperCase());
  if (!allowedSlots.includes(normalizedSlot)) {
    return res.status(400).json({ error: 'Invalid slot value', detail: `slot must be one of: ${allowedSlots.join(', ')}` });
  }
  try {
    const result = await performEquipForCharacter(characterId, itemId, normalizedSlot);
    return res.json({ success: true, ...result });
  } catch (e: any) {
    if (e instanceof DomainError) {
      // include the domain error code in the response for easier client debugging
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
