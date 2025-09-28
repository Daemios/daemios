import express from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { fetchContainersWithItems, mapItemForClient, moveItemForCharacter, placeItem } from './inventory.service';
import { characterService } from '../character/character.service';
import { prisma } from '../../db/prisma';

export const getInventory = asyncHandler(async (req: express.Request, res: express.Response) => {
  const rawUserId = req.user && (req.user as any).id ? (req.user as any).id : null;
  if (!rawUserId) return res.status(200).json([]);
  const userId = Number(rawUserId);
  const character = await characterService.getActiveCharacterForUser(userId);
  if (!character) return res.status(200).json([]);
  const containers = await fetchContainersWithItems(character.id);
  const out = containers.map((c: any) => ({ id: c.id, name: c.name || null, label: c.label || null, capacity: c.capacity || 0, containerType: c.containerType || 'BASIC', nestable: !!c.nestable, itemId: c.itemId ?? null, items: (c.items || []).map(mapItemForClient) }));

  // Determine which containers are equipped for this character so the client
  // can receive an explicit list of equipped containers and nestable
  // containers separately. Keep `containers` for backward compatibility.
  const equipmentRows = await prisma.equipment.findMany({ where: { characterId: character.id } });
  const equippedItemIds = new Set(equipmentRows.map((r: any) => r.itemId).filter((id: any) => id != null));

  const equippedContainers = out.filter((c: any) => {
    if (!c) return false;
    const name = String(c.name || '').toLowerCase();
    if (name === 'pockets' || String(c.containerType || '').toUpperCase() === 'POCKETS') return true;
    if (c.itemId != null && equippedItemIds.has(c.itemId)) return true;
    return false;
  });

  const nestableContainers = out.filter((c: any) => !!c.nestable);

  res.json({ success: true, containers: out, equippedContainers, nestableContainers });
});

export const postMove = asyncHandler(async (req: express.Request, res: express.Response) => {
  const rawUserId = req.user && (req.user as any).id ? (req.user as any).id : null;
  if (!rawUserId) return res.status(400).json({ error: 'No active character' });
  const userId = Number(rawUserId);
  const character = await characterService.getActiveCharacterForUser(userId);
  if (!character) return res.status(400).json({ error: 'No active character' });
  const payload = req.body;
  const updated = await moveItemForCharacter(character, payload);
  // updated is canonical containers array; compute groups using current equipment
  const charWithEquip = await characterService.buildCharacterWithEquipment(character);
  const equippedMap = (charWithEquip && charWithEquip.equipped) || {};
  const equippedIds = new Set(Object.values(equippedMap).map((it: any) => (it && it.id ? Number(it.id) : null)).filter((v: any) => v != null));

  const equippedContainers = (updated || []).filter((c: any) => {
    if (!c) return false;
    const name = String(c.name || '').toLowerCase();
    if (name === 'pockets' || String(c.containerType || '').toUpperCase() === 'POCKETS') return true;
    if (c.itemId != null && equippedIds.has(Number(c.itemId))) return true;
    return false;
  });

  const nestableContainers = (updated || []).filter((c: any) => !!c.nestable);

  res.json({ success: true, containers: updated, equippedContainers, nestableContainers });
});

export const postAction = asyncHandler(async (req: express.Request, res: express.Response) => {
  const rawUserId = req.user && (req.user as any).id ? (req.user as any).id : null;
  if (!rawUserId) return res.status(400).json({ error: 'No active character' });
  const userId = Number(rawUserId);
  const character = await characterService.getActiveCharacterForUser(userId);
  if (!character) return res.status(400).json({ error: 'No active character' });
  const payload = req.body;

  // Delegate to placeItem which will route to equipment or container handlers.
  const result = await placeItem(character, payload);

  // Normalize result into { containers, equippedContainers, nestableContainers }
  let containers: any[] = [];
  let equipment: any[] = [];
  if (result) {
    if (result.containers) containers = result.containers;
    else if (Array.isArray(result)) containers = result as any[];
    if (result.equipment) equipment = result.equipment;
  }

  const mapped = (containers || []).map((c: any) => ({
    id: c.id,
    name: c.name || null,
    label: c.label || null,
    capacity: c.capacity || 0,
    containerType: c.containerType || 'BASIC',
    nestable: !!c.nestable,
    itemId: c.itemId ?? null,
    items: (c.items || []).map(mapItemForClient),
  }));

  const equippedIds = new Set((equipment || []).map((e: any) => e.itemId).filter((id: any) => id != null));
  const equippedContainers = mapped.filter((c: any) => {
    if (!c) return false;
    const name = String(c.name || '').toLowerCase();
    if (name === 'pockets' || String(c.containerType || '').toUpperCase() === 'POCKETS') return true;
    if (c.itemId != null && equippedIds.has(c.itemId)) return true;
    return false;
  });

  const nestableContainers = mapped.filter((c: any) => !!c.nestable);

  res.json({ success: true, containers: mapped, equippedContainers, nestableContainers });
});
