import express, { Request, Response } from 'express';
import { characterService } from '../modules/character/character.service';

// buildCharacterWithEquipment is implemented in characterService; use service helpers here

const router = express.Router();

// Logout user
router.post('/logout', (req, res) => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  characterService.deactivateCharacters(req.user.id)
    .then(() => {
      // @ts-ignore
      req.logout(() => res.json({ success: true }));
    })
    .catch((err: any) => {
      console.error(err);
      res.status(500).json({ error: 'Server error during logout' });
    });
});

// Refresh character data
router.get('/refresh', async (req: Request, res: Response) => {
  try {
    // Require Passport deserialized `req.user` only
    const rawUserId = req.user && (req.user as any).id ? (req.user as any).id : null;
    if (!rawUserId) return res.status(401).json({ error: 'Not authenticated' });
    const userId = Number(rawUserId);
    const character = await characterService.getActiveCharacterForUser(userId);

    if (!character || !character.id) {
      return res.status(404).json({ error: 'No active character found' });
    }

    try {
      const charWithEquip = await characterService.buildCharacterWithEquipment(character);
      console.debug('[user.refresh] responding with character', { id: charWithEquip.id, equipped: charWithEquip.equipped });
      res.json({ success: true, character: charWithEquip });
    } catch (e) {
      console.warn('Failed to load equipment for character', character.id, e);
      console.debug('[user.refresh] responding with character (no equip)', { id: character.id, equipped: character.equipped });
      res.json({ success: true, character });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'An error occurred' });
  }
});

// Select character
router.post('/character/select', async (req: Request, res: Response) => {
  try {
    const rawUserId = req.user && (req.user as any).id ? (req.user as any).id : null;
    if (!rawUserId) return res.status(401).json({ error: 'Not authenticated' });
    const userId = Number(rawUserId);
    const { characterId } = req.body;

    await characterService.deactivateCharacters(userId);
    const rows = await characterService.activateCharacter(userId, characterId);
    if (!rows || (rows as any).count === 0) {
      return res.status(404).json({ error: 'No character found or updated' });
    }
    const character = await characterService.getActiveCharacterForUser(userId);
    if (!character || !character.id) {
      return res.status(404).json({ error: 'No active character found' });
    }

    try {
      const charWithEquip = await characterService.buildCharacterWithEquipment(character);
      const containers = await characterService.getContainersForCharacter(character.id);
      console.debug('[user.select] responding with character', { id: charWithEquip.id, equipped: charWithEquip.equipped, containers: containers.length });
      res.json({ success: true, character: charWithEquip, containers });
    } catch (e) {
      console.warn('Failed to load equipment for character', character.id, e);
      console.debug('[user.select] responding with character (no equip)', { id: character.id, equipped: character.equipped });
      res.json({ success: true, character });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'An error occurred' });
  }
});

// Create character
router.post('/character/create', async (req: Request, res: Response) => {
  try {
    const rawUserId = req.user && (req.user as any).id ? (req.user as any).id : null;
    if (!rawUserId) return res.status(401).json({ error: 'Not authenticated' });
    const userId = Number(rawUserId);
    const { name, raceId, image } = req.body;

    const createdChar = await characterService.createCharacterForUser(userId, { name, raceId, image });
    res.status(200).json({ success: true, character: createdChar });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get characters
router.get('/characters', async (req: Request, res: Response) => {
  try {
    const rawUserId = req.user && (req.user as any).id ? (req.user as any).id : null;
    if (!rawUserId) return res.status(401).json({ error: 'Not authenticated' });
    const userId = Number(rawUserId);
  const rows = await characterService.listCharactersForUser(userId);
    const characterList = rows.map((row: any) => ({
      ...row,
      location: { dangerous: true, name: 'The Wilds' },
      level: 1,
      vessels: [
        { color: '#156156' },
        { color: '#a12078' },
      ],
    }));

    res.json({ success: true, characters: characterList });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server Error' });
  }
});

export default router;
