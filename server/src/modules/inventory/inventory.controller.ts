import express from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { fetchContainersWithItems, mapItemForClient, moveItemForCharacter, iconForContainerType } from './inventory.service';
import { characterService } from '../character/character.service';

export const getInventory = asyncHandler(async (req: express.Request, res: express.Response) => {
  const rawUserId = req.user && (req.user as any).id ? (req.user as any).id : null;
  if (!rawUserId) return res.status(200).json([]);
  const userId = Number(rawUserId);
  const character = await characterService.getActiveCharacterForUser(userId);
  if (!character) return res.status(200).json([]);
  const containers = await fetchContainersWithItems(character.id);
  const out = containers.map((c: any) => ({ id: c.id, name: c.name || null, label: c.label || null, capacity: c.capacity || 0, containerType: c.containerType || 'BASIC', icon: iconForContainerType(c.containerType), items: (c.items || []).map(mapItemForClient) }));
  res.json({ success: true, containers: out });
});

export const postMove = asyncHandler(async (req: express.Request, res: express.Response) => {
  const rawUserId = req.user && (req.user as any).id ? (req.user as any).id : null;
  if (!rawUserId) return res.status(400).json({ error: 'No active character' });
  const userId = Number(rawUserId);
  const character = await characterService.getActiveCharacterForUser(userId);
  if (!character) return res.status(400).json({ error: 'No active character' });
  const payload = req.body;
  const updated = await moveItemForCharacter(character, payload);
  res.json({ success: true, containers: updated });
});
