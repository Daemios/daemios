import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { equipItemToCharacter, unequipItemFromSlot, listEquipmentForCharacter } from './characterEquip.service';
import { EquipmentSlot } from '@prisma/client';

export const postEquip = asyncHandler(async (req: Request, res: Response) => {
  const character = req.session?.activeCharacter as any;
  if (!character) return res.status(400).json({ error: 'No active character' });
  const { itemId, slot } = req.body;
  if (!itemId || !slot) return res.status(400).json({ error: 'itemId and slot required' });
  const updated = await equipItemToCharacter(character.id, Number(itemId), slot as EquipmentSlot);
  res.json(updated);
});

export const postUnequip = asyncHandler(async (req: Request, res: Response) => {
  const character = req.session?.activeCharacter as any;
  if (!character) return res.status(400).json({ error: 'No active character' });
  const { slot } = req.body;
  if (!slot) return res.status(400).json({ error: 'slot required' });
  const removed = await unequipItemFromSlot(character.id, slot as EquipmentSlot);
  res.json(removed);
});

export const getList = asyncHandler(async (req: Request, res: Response) => {
  const character = req.session?.activeCharacter as any;
  if (!character) return res.status(200).json([]);
  const list = await listEquipmentForCharacter(character.id);
  res.json(list);
});
