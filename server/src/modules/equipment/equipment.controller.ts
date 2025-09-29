import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { respondError, respondSuccess } from '../../utils/apiResponse';
import { listEquipmentForCharacter, performEquipForCharacter, unequipItemToContainer } from './equipment.service';
import { characterService } from '../character/character.service';
import { EquipmentSlot } from '@prisma/client';
import { DomainError } from './equipment.domain';

export const postEquip = asyncHandler(async (req: Request, res: Response) => {
  const rawUserId = req.user && (req.user as any).id ? (req.user as any).id : null;
  if (!rawUserId) return respondError(res, 400, 'no_active_character', 'No active character');
  const userId = Number(rawUserId);
  const character = await characterService.getActiveCharacterForUser(userId);
  if (!character) return respondError(res, 400, 'no_active_character', 'No active character');
  const { itemId, slot } = req.body;
  if (!itemId || !slot) {
    return respondError(res, 400, 'invalid_payload', 'itemId and slot required');
  }

  // Validate slot string against the Prisma enum keys to catch client drift early.
  if (!Object.prototype.hasOwnProperty.call(EquipmentSlot, slot)) {
    return respondError(res, 400, 'invalid_slot', 'Invalid slot', { slot });
  }

  try {
    // Use performEquipForCharacter so we return the full envelope the client
    // expects (equipment rows + containers + capacity metadata).
    const updated = await performEquipForCharacter(character.id, Number(itemId), slot as any);
    respondSuccess(res, 200, updated, 'Equipment updated');
  } catch (err: any) {
    // If it's a domain error, surface its code to the client for clearer handling.
    if (err instanceof DomainError) {
      return respondError(res, 400, err.code, err.message);
    }
    throw err;
  }
});

export const postUnequip = asyncHandler(async (req: Request, res: Response) => {
  const rawUserId = req.user && (req.user as any).id ? (req.user as any).id : null;
  if (!rawUserId) return respondError(res, 400, 'no_active_character', 'No active character');
  const userId = Number(rawUserId);
  const character = await characterService.getActiveCharacterForUser(userId);
  if (!character) return respondError(res, 400, 'no_active_character', 'No active character');

  // Minimal trusted payload from client
  const { itemId, containerId, containerIndex } = req.body || {};
  if (!itemId) return respondError(res, 400, 'invalid_payload', 'itemId required');
  if (typeof containerId === 'undefined') return respondError(res, 400, 'invalid_payload', 'containerId required');
  if (typeof containerIndex === 'undefined') return respondError(res, 400, 'invalid_payload', 'containerIndex required');

  try {
    const result = await unequipItemToContainer(character.id, Number(itemId), Number(containerId), Number(containerIndex));
    return respondSuccess(res, 200, { item: result.item, changed: result.changed }, 'Item unequipped');
  } catch (err: any) {
    if (err instanceof DomainError) return respondError(res, 400, err.code, err.message);
    throw err;
  }
});

export const getList = asyncHandler(async (req: Request, res: Response) => {
  const rawUserId = req.user && (req.user as any).id ? (req.user as any).id : null;
  if (!rawUserId) return respondSuccess(res, 200, []);
  const userId = Number(rawUserId);
  const character = await characterService.getActiveCharacterForUser(userId);
  if (!character) return respondSuccess(res, 200, []);
  const list = await listEquipmentForCharacter(character.id);
  respondSuccess(res, 200, list);
});
