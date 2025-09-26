import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { equipItemToCharacter, unequipItemFromSlot, listEquipmentForCharacter } from './equipment.service';
import { EquipmentSlot } from '@prisma/client';
import { DomainError } from './equipment.domain';

export const postEquip = asyncHandler(async (req: Request, res: Response) => {
  const character = req.session?.activeCharacter as any;
  if (!character) return res.status(400).json({ error: 'No active character' });
  const { itemId, slot } = req.body;
  if (!itemId || !slot) return res.status(400).json({ error: 'itemId and slot required' });

  // Validate slot string against the Prisma enum keys to catch client drift early.
  if (!Object.prototype.hasOwnProperty.call(EquipmentSlot, slot)) {
    return res.status(400).json({ error: 'invalid slot', slot });
  }

  try {
    const updated = await equipItemToCharacter(character.id, Number(itemId), slot as EquipmentSlot);
    res.json(updated);
  } catch (err: any) {
    // If it's a domain error, surface its code to the client for clearer handling.
    if (err instanceof DomainError) {
      return res.status(400).json({ error: err.message, code: err.code });
    }
    throw err;
  }
});

export const postUnequip = asyncHandler(async (req: Request, res: Response) => {
  const character = req.session?.activeCharacter as any;
  if (!character) return res.status(400).json({ error: 'No active character' });
  const { slot } = req.body;
  if (!slot) return res.status(400).json({ error: 'slot required' });
  if (!Object.prototype.hasOwnProperty.call(EquipmentSlot, slot)) {
    return res.status(400).json({ error: 'invalid slot', slot });
  }
  const removed = await unequipItemFromSlot(character.id, slot as EquipmentSlot);
  res.json(removed);
});

export const getList = asyncHandler(async (req: Request, res: Response) => {
  const character = req.session?.activeCharacter as any;
  if (!character) return res.status(200).json([]);
  const list = await listEquipmentForCharacter(character.id);
  res.json(list);
});
