import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { listEquipmentForCharacter, performEquipForCharacter, unequipItemToContainer } from './equipment.service';
import { CharacterApplicationService } from '../character/application/character.service';
import { EquipmentSlot } from '@prisma/client';
import { DomainError } from './equipment.domain';

export interface EquipmentControllerDependencies {
  characterService: CharacterApplicationService;
}

export function createEquipmentController({ characterService }: EquipmentControllerDependencies) {
  const postEquip = asyncHandler(async (req: Request, res: Response) => {
    const rawUserId = req.user && (req.user as any).id ? (req.user as any).id : null;
    if (!rawUserId) return res.status(400).json({ error: 'No active character' });
    const userId = Number(rawUserId);
    const character = await characterService.getActiveCharacterForUser(userId);
    if (!character) return res.status(400).json({ error: 'No active character' });
    const { itemId, slot } = req.body;
    if (!itemId || !slot) return res.status(400).json({ error: 'itemId and slot required' });

    if (!Object.prototype.hasOwnProperty.call(EquipmentSlot, slot)) {
      return res.status(400).json({ error: 'invalid slot', slot });
    }

    try {
      const updated = await performEquipForCharacter(character.id, Number(itemId), slot as any);
      res.json(updated);
    } catch (err: any) {
      if (err instanceof DomainError) {
        return res.status(400).json({ error: err.message, code: err.code });
      }
      throw err;
    }
  });

  const postUnequip = asyncHandler(async (req: Request, res: Response) => {
    const rawUserId = req.user && (req.user as any).id ? (req.user as any).id : null;
    if (!rawUserId) return res.status(400).json({ error: 'No active character' });
    const userId = Number(rawUserId);
    const character = await characterService.getActiveCharacterForUser(userId);
    if (!character) return res.status(400).json({ error: 'No active character' });

    const { itemId, containerId, containerIndex } = req.body || {};
    if (!itemId) return res.status(400).json({ error: 'itemId required' });
    if (typeof containerId === 'undefined') return res.status(400).json({ error: 'containerId required' });
    if (typeof containerIndex === 'undefined') return res.status(400).json({ error: 'containerIndex required' });

    try {
      const result = await unequipItemToContainer(character.id, Number(itemId), Number(containerId), Number(containerIndex));
      return res.json({ success: true, item: result.item, changed: result.changed });
    } catch (err: any) {
      if (err instanceof DomainError) return res.status(400).json({ error: err.message, code: err.code });
      throw err;
    }
  });

  const getList = asyncHandler(async (req: Request, res: Response) => {
    const rawUserId = req.user && (req.user as any).id ? (req.user as any).id : null;
    if (!rawUserId) return res.status(200).json([]);
    const userId = Number(rawUserId);
    const character = await characterService.getActiveCharacterForUser(userId);
    if (!character) return res.status(200).json([]);
    const list = await listEquipmentForCharacter(character.id);
    res.json(list);
  });

  return { postEquip, postUnequip, getList };
}
