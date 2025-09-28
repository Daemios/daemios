import express from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { InventoryApplicationService } from './application/inventory.service';
import { CharacterApplicationService } from '../character/application/character.service';

export interface InventoryControllerDependencies {
  inventoryService: InventoryApplicationService;
  characterService: CharacterApplicationService;
}

export function createInventoryController({ inventoryService, characterService }: InventoryControllerDependencies) {
  const getInventory = asyncHandler(async (req: express.Request, res: express.Response) => {
    const rawUserId = req.user && (req.user as any).id ? (req.user as any).id : null;
    if (!rawUserId) return res.status(200).json([]);
    const userId = Number(rawUserId);
    const character = await characterService.getActiveCharacterForUser(userId);
    if (!character) return res.status(200).json([]);
    const containers = await inventoryService.fetchContainersWithItems(character.id);

    const equipmentRows = await inventoryService.listEquipmentForCharacter(character.id);
    const equippedItemIds = new Set(
      equipmentRows.map((r: any) => r.itemId).filter((id: any) => id != null),
    );

    const equippedContainers = containers.filter((c: any) => {
      if (!c) return false;
      const name = String(c.name || '').toLowerCase();
      if (name === 'pockets' || String(c.containerType || '').toUpperCase() === 'POCKETS') return true;
      if (c.itemId != null && equippedItemIds.has(c.itemId)) return true;
      return false;
    });

    const nestableContainers = containers.filter((c: any) => !!c.nestable);

    res.json({ success: true, containers, equippedContainers, nestableContainers });
  });

  const postMove = asyncHandler(async (req: express.Request, res: express.Response) => {
    const rawUserId = req.user && (req.user as any).id ? (req.user as any).id : null;
    if (!rawUserId) return res.status(400).json({ error: 'No active character' });
    const userId = Number(rawUserId);
    const character = await characterService.getActiveCharacterForUser(userId);
    if (!character) return res.status(400).json({ error: 'No active character' });
    const payload = req.body;
    const updated = await inventoryService.moveItemForCharacter(character, payload);
    const charWithEquip = await characterService.buildCharacterWithEquipment(character);
    const equippedMap = (charWithEquip && charWithEquip.equipped) || {};
    const equippedIds = new Set(
      Object.values(equippedMap)
        .map((it: any) => (it && it.id ? Number(it.id) : null))
        .filter((v: any) => v != null),
    );

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

  const postAction = asyncHandler(async (req: express.Request, res: express.Response) => {
    const rawUserId = req.user && (req.user as any).id ? (req.user as any).id : null;
    if (!rawUserId) return res.status(400).json({ error: 'No active character' });
    const userId = Number(rawUserId);
    const character = await characterService.getActiveCharacterForUser(userId);
    if (!character) return res.status(400).json({ error: 'No active character' });
    const payload = req.body;

    const result = await inventoryService.placeItem(character, payload);

    let containers: any[] = [];
    let equipment: any[] = [];
    if (result) {
      if (result.containers) containers = result.containers;
      else if (Array.isArray(result)) containers = result as any[];
      if (result.equipment) equipment = result.equipment;
    }

    const equippedIds = new Set((equipment || []).map((e: any) => e.itemId).filter((id: any) => id != null));
    const equippedContainers = (containers || []).filter((c: any) => {
      if (!c) return false;
      const name = String(c.name || '').toLowerCase();
      if (name === 'pockets' || String(c.containerType || '').toUpperCase() === 'POCKETS') return true;
      if (c.itemId != null && equippedIds.has(c.itemId)) return true;
      return false;
    });

    const nestableContainers = (containers || []).filter((c: any) => !!c.nestable);

    res.json({ success: true, containers, equippedContainers, nestableContainers });
  });

  return { getInventory, postMove, postAction };
}
