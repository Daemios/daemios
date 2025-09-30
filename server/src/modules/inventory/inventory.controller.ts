import express from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { respondError, respondSuccess } from '../../utils/apiResponse';
import { fetchContainersWithItems, mapItemForClient, moveItemForCharacter, placeItem } from './inventory.service';
import { characterService } from '../character/character.service';
import { prisma } from '../../db/prisma';

export const getInventory = asyncHandler(async (req: express.Request, res: express.Response) => {
  const rawUserId = req.user && (req.user as any).id ? (req.user as any).id : null;
  if (!rawUserId) return respondSuccess(res, 200, []);
  const userId = Number(rawUserId);
  const character = await characterService.getActiveCharacterForUser(userId);
  if (!character) return respondSuccess(res, 200, []);
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

  respondSuccess(res, 200, { containers: out, equippedContainers, nestableContainers });
});

export const postMove = asyncHandler(async (req: express.Request, res: express.Response) => {
  const rawUserId = req.user && (req.user as any).id ? (req.user as any).id : null;
  if (!rawUserId) return respondError(res, 400, 'no_active_character', 'No active character');
  const userId = Number(rawUserId);
  const character = await characterService.getActiveCharacterForUser(userId);
  if (!character) return respondError(res, 400, 'no_active_character', 'No active character');
  const payload = req.body;
  const updated = await moveItemForCharacter(character, payload);
  // moveItemForCharacter returns { containers, updatedContainerIds }
  const canonical = updated && updated.containers ? updated.containers : [];
  const updatedContainerIds = updated && Array.isArray(updated.updatedContainerIds) ? updated.updatedContainerIds : [];

  // Build mapped containers for UI lists (equip/nestable). Keep mapped array for backward compatibility.
  const mapped = (canonical || []).map((c: any) => ({ id: c.id, name: c.name || null, label: c.label || null, capacity: c.capacity || 0, containerType: c.containerType || 'BASIC', nestable: !!c.nestable, itemId: c.itemId ?? null, items: (c.items || []).map(mapItemForClient) }));

  const charWithEquip = await characterService.buildCharacterWithEquipment(character);
  const equippedMap = (charWithEquip && charWithEquip.equipped) || {};
  const equippedIds = new Set(Object.values(equippedMap).map((it: any) => (it && it.id ? Number(it.id) : null)).filter((v: any) => v != null));

  const equippedContainers = (mapped || []).filter((c: any) => {
    if (!c) return false;
    const name = String(c.name || '').toLowerCase();
    if (name === 'pockets' || String(c.containerType || '').toUpperCase() === 'POCKETS') return true;
    if (c.itemId != null && equippedIds.has(Number(c.itemId))) return true;
    return false;
  });

  const nestableContainers = (mapped || []).filter((c: any) => !!c.nestable);

  // If updatedContainerIds is present, return a partial diff where containers is a map keyed by id
  if (updatedContainerIds && updatedContainerIds.length > 0) {
    const containerMap: any = {};
    for (const id of updatedContainerIds) {
      const found = mapped.find((c: any) => String(c.id) === String(id));
      if (found) {
        // send slot-level representation for each updated container (slots map)
        const slots: any = {};
        (found.items || []).forEach((it: any) => {
          const idx = Number(it.containerIndex ?? it.index ?? -1);
          if (idx >= 0) slots[String(idx)] = it;
        });
        containerMap[String(id)] = { id: found.id, slots, capacity: found.capacity };
      }
    }
    return respondSuccess(res, 200, { capacity_updated: false, containers: containerMap, updatedContainerIds, equippedContainers, nestableContainers }, 'Inventory diff');
  }

  respondSuccess(res, 200, { containers: mapped, equippedContainers, nestableContainers }, 'Inventory updated');
});

export const postAction = asyncHandler(async (req: express.Request, res: express.Response) => {
  const rawUserId = req.user && (req.user as any).id ? (req.user as any).id : null;
  if (!rawUserId) return respondError(res, 400, 'no_active_character', 'No active character');
  const userId = Number(rawUserId);
  const character = await characterService.getActiveCharacterForUser(userId);
  if (!character) return respondError(res, 400, 'no_active_character', 'No active character');
  const payload = req.body;

  // Delegate to placeItem which will route to equipment or container handlers.
  const result = await placeItem(character, payload);

  // Normalize result into { containers, equippedContainers, nestableContainers }
  let containers: any[] = [];
  let equipment: any[] = [];
  if (result) {
    // result may already be a structured object coming from equipment or container handlers
    if (result.containers) containers = result.containers;
    else if (Array.isArray(result)) containers = result as any[];
    if (result.equipment) equipment = result.equipment;
    // also accept diff metadata returned by service
    var updatedContainerIds = result.updatedContainerIds || [];
    var capacityUpdated = result.capacityUpdated || false;
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

  // If service provided updatedContainerIds, send a partial diff map instead
  if (updatedContainerIds && Array.isArray(updatedContainerIds) && updatedContainerIds.length > 0) {
    const containerMap: any = {};
    for (const id of updatedContainerIds) {
      const found = mapped.find((c: any) => String(c.id) === String(id));
      if (found) {
        const slots: any = {};
        (found.items || []).forEach((it: any) => {
          const idx = Number(it.containerIndex ?? it.index ?? -1);
          if (idx >= 0) slots[String(idx)] = it;
        });
        containerMap[String(id)] = { id: found.id, slots, capacity: found.capacity };
      }
    }
    return respondSuccess(res, 200, { capacity_updated: !!capacityUpdated, containers: containerMap, updatedContainerIds, equipment, equippedContainers, nestableContainers }, 'Inventory diff');
  }

  respondSuccess(res, 200, { containers: mapped, equippedContainers, nestableContainers, equipment }, 'Inventory updated');
});
