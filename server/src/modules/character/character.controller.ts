import { Request, Response } from 'express';
import { characterService, buildCharacterWithEquipment } from './character.service';

export const characterController = {
  logout: async (req: Request, res: Response) => {
    try {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      await characterService.deactivateCharacters((req.user as any).id);
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      req.logout(() => res.json({ success: true }));
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error during logout' });
    }
  },

  refresh: async (req: Request, res: Response) => {
    try {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const userId = (req.session as any).passport.user.id;
      const character = await characterService.getActiveCharacterForUser(userId);
      if (!character || !character.id) return res.status(404).json({ error: 'No active character found' });
      try {
        const charWithEquip = await buildCharacterWithEquipment(character);
        res.json({ success: true, character: charWithEquip });
      } catch (e) {
        console.warn('Failed to load equipment for character', character.id, e);
        res.json({ success: true, character });
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'An error occurred' });
    }
  },

  selectCharacter: async (req: Request, res: Response) => {
    try {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const userId = (req.session as any).passport.user.id;
      const { characterId } = req.body;
      await characterService.deactivateCharacters(userId);
      const rows = await characterService.activateCharacter(userId, characterId);
      if (!rows || (rows as any).count === 0) return res.status(404).json({ error: 'No character found or updated' });
      const character = await characterService.getActiveCharacterForUser(userId);
      if (!character || !character.id) return res.status(404).json({ error: 'No active character found' });

      try {
        const charWithEquip = await buildCharacterWithEquipment(character);
        const containers = await characterService.getContainersForCharacter(character.id);
        res.json({ success: true, character: charWithEquip, containers });
      } catch (e) {
        console.warn('Failed to load equipment for character', character.id, e);
        res.json({ success: true, character });
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'An error occurred' });
    }
  },

  createCharacter: async (req: Request, res: Response) => {
    try {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const userId = (req.session as any).passport.user.id;
      const { name, raceId, image } = req.body;
      const createdChar = await characterService.createCharacterForUser(userId, { name, raceId, image });
      res.status(200).json({ success: true, character: createdChar });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  listCharacters: async (req: Request, res: Response) => {
    try {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const userId = (req.session as any).passport.user.id;
      const rows = await characterService.listCharactersForUser(userId);
      const characterList = rows.map((row: any) => ({
        ...row,
        location: { dangerous: true, name: 'The Wilds' },
        level: 1,
        vessels: [{ color: '#156156' }, { color: '#a12078' }],
      }));
      res.json({ success: true, characters: characterList });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Server Error' });
    }
  },
};
