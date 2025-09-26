import express from 'express';
import { characterService } from '../modules/character/character.service';
import { performEquipForCharacter } from '../modules/equipment/equipment.service';
import { DomainError } from '../modules/equipment/equipment.domain';

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
  const { characterId: bodyCharacterId, itemId, targetSlot } = req.body || {};
  let characterId = bodyCharacterId;
  try {
    if (!characterId) {
      const character = await characterService.getActiveCharacterForUser(userId);
      if (character && character.id) characterId = character.id;
    }
  } catch (e) {
    console.warn('equipment: failed to resolve active character from session', e && (e as any).code);
  }
  if (!itemId || !targetSlot) return res.status(400).json({ error: 'Missing parameters: itemId and targetSlot are required' });
  if (!characterId) return res.status(404).json({ error: 'No active character found for session' });
  const normalizedSlot = String(targetSlot).toUpperCase();
  try {
    const result = await performEquipForCharacter(characterId, itemId, normalizedSlot);
    return res.json({ success: true, ...result });
  } catch (e: any) {
    if (e instanceof DomainError) {
      switch (e.code) {
        case 'ITEM_NOT_FOUND': return res.status(404).json({ error: e.message });
        case 'ITEM_NOT_OWNED': return res.status(403).json({ error: e.message });
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
          return res.status(400).json({ error: e.message });
        default:
          return res.status(400).json({ error: e.message });
      }
    }
    console.error('Equip error', e);
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
