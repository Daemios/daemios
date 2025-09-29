import { Request, Response } from 'express';
import { characterService, buildCharacterWithEquipment } from './character.service';
import { respondError, respondSuccess } from '../../utils/apiResponse';

export const characterController = {
  logout: async (req: Request, res: Response) => {
    try {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      await characterService.deactivateCharacters((req.user as any).id);
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      req.logout(() => respondSuccess(res, 200, { loggedOut: true }, 'Logged out'));
    } catch (err) {
      console.error(err);
      respondError(res, 500, 'internal_error', 'Server error during logout');
    }
  },

  refresh: async (req: Request, res: Response) => {
    try {
      const rawUserId = req.user && (req.user as any).id ? (req.user as any).id : null;
      if (!rawUserId) return respondError(res, 401, 'not_authenticated', 'Not authenticated');
      const userId = Number(rawUserId);
      const character = await characterService.getActiveCharacterForUser(userId);
      if (!character || !character.id) return respondError(res, 404, 'no_active_character', 'No active character found');
      try {
        const charWithEquip = await buildCharacterWithEquipment(character);
        respondSuccess(res, 200, { character: charWithEquip });
      } catch (e) {
        console.warn('Failed to load equipment for character', character.id, e);
        respondSuccess(res, 200, { character });
      }
    } catch (err) {
      console.error(err);
      respondError(res, 500, 'internal_error', 'An error occurred');
    }
  },

  selectCharacter: async (req: Request, res: Response) => {
    try {
      const rawUserId = req.user && (req.user as any).id ? (req.user as any).id : null;
      if (!rawUserId) return respondError(res, 401, 'not_authenticated', 'Not authenticated');
      const userId = Number(rawUserId);
      const { characterId } = req.body;
      await characterService.deactivateCharacters(userId);
      const rows = await characterService.activateCharacter(userId, characterId);
      if (!rows || (rows as any).count === 0) {
        return respondError(res, 404, 'no_character_updated', 'No character found or updated');
      }
      const character = await characterService.getActiveCharacterForUser(userId);
      if (!character || !character.id) return respondError(res, 404, 'no_active_character', 'No active character found');

      try {
        const charWithEquip = await buildCharacterWithEquipment(character);
        const containers = await characterService.getContainersForCharacter(character.id);
        respondSuccess(res, 200, { character: charWithEquip, containers });
      } catch (e) {
        console.warn('Failed to load equipment for character', character.id, e);
        respondSuccess(res, 200, { character });
      }
    } catch (err) {
      console.error(err);
      respondError(res, 500, 'internal_error', 'An error occurred');
    }
  },

  createCharacter: async (req: Request, res: Response) => {
    try {
      const rawUserId = req.user && (req.user as any).id ? (req.user as any).id : null;
      if (!rawUserId) return respondError(res, 401, 'not_authenticated', 'Not authenticated');
      const userId = Number(rawUserId);
      const { name, raceId, image } = req.body;
      const createdChar = await characterService.createCharacterForUser(userId, { name, raceId, image });
      respondSuccess(res, 201, { character: createdChar }, 'Character created');
    } catch (err) {
      console.error(err);
      respondError(res, 500, 'internal_error', 'Internal server error');
    }
  },

  listCharacters: async (req: Request, res: Response) => {
    try {
      const rawUserId = req.user && (req.user as any).id ? (req.user as any).id : null;
      if (!rawUserId) return respondError(res, 401, 'not_authenticated', 'Not authenticated');
      const userId = Number(rawUserId);
      const rows = await characterService.listCharactersForUser(userId);
      const characterList = rows.map((row: any) => ({
        ...row,
        location: { dangerous: true, name: 'The Wilds' },
        level: 1,
        vessels: [{ color: '#156156' }, { color: '#a12078' }],
      }));
      respondSuccess(res, 200, { characters: characterList });
    } catch (e) {
      console.error(e);
      respondError(res, 500, 'internal_error', 'Server Error');
    }
  },
};
