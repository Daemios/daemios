import express from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { fetchContainersWithItems, mapItemForClient, moveItemForCharacter, iconForContainerType } from './inventory.service';

export const getInventory = asyncHandler(async (req: express.Request, res: express.Response) => {
  const user = req.session?.activeCharacter as any;
  if (!user) return res.status(200).json([]);
  const containers = await fetchContainersWithItems(user.id);
  const out = containers.map((c: any) => ({ id: c.id, name: c.name || null, label: c.label || null, capacity: c.capacity || 0, containerType: c.containerType || 'BASIC', icon: iconForContainerType(c.containerType), items: (c.items || []).map(mapItemForClient) }));
  res.json(out);
});

export const postMove = asyncHandler(async (req: express.Request, res: express.Response) => {
  const user = req.session?.activeCharacter as any;
  if (!user) return res.status(400).json({ error: 'No active character' });
  const payload = req.body;
  const updated = await moveItemForCharacter(user, payload);
  res.json(updated);
});
