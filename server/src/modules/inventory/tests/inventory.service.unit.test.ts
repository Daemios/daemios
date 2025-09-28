import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../db/prisma', () => ({
  prisma: {
    container: { findMany: vi.fn(), findUnique: vi.fn() },
    item: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    equipment: { findFirst: vi.fn(), findMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock('../../equipment/equipment.service', () => ({
  performEquipForCharacter: vi.fn(),
  unequipItemToContainer: vi.fn(),
}));

// Note: the module under test imports prisma from ../../db/prisma; adjust import path resolution used in tests by importing module normally so mocks apply.
import * as inventoryService from '../inventory.service';
import { prisma } from '../../../db/prisma';
import * as equipmentService from '../../equipment/equipment.service';

describe('inventory.service', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('mapItemForClient returns null on empty', () => {
    expect(inventoryService.mapItemForClient(null)).toBeNull();
  });

  it('mapItemForClient normalizes presentation fields', () => {
    const mapped = inventoryService.mapItemForClient({ id: 3, image: null, label: null, name: null, displayName: 'Fancy Flask', itemType: 42 } as any);
    expect(mapped).not.toBeNull();
    expect(mapped?.img).toBe('/img/debug/placeholder.png');
    expect(mapped?.label).toBe('Fancy Flask');
    expect(mapped?.itemType).toBe('42');
  });

  it('fetchContainersWithItems falls back on P2022 schema mismatch', async () => {
    (prisma.container.findMany as any) = vi.fn((args: any) => {
      if (args && args.include) throw { code: 'P2022' };
      return [{ id: 1 }];
    });
    const res = await inventoryService.fetchContainersWithItems(1);
    expect(res).toHaveLength(1);
  });

  it('moveItemForCharacter returns 404 when item not found', async () => {
    (prisma.item.findUnique as any) = vi.fn().mockResolvedValue(null);
    const char = { id: 10 } as any;
    await expect(inventoryService.moveItemForCharacter(char, { itemId: 99 })).rejects.toHaveProperty('status', 404);
  });

  it('moveItemForCharacter rejects when item belongs to other character', async () => {
    (prisma.item.findUnique as any) = vi.fn().mockResolvedValue({ id: 5, characterId: 1 });
    const char = { id: 10 } as any;
    await expect(inventoryService.moveItemForCharacter(char, { itemId: 5 })).rejects.toHaveProperty('status', 403);
  });

  it('moveItemForCharacter validates target container and capacity', async () => {
    (prisma.item.findUnique as any) = vi.fn().mockResolvedValue({ id: 6, characterId: 10, containerId: null, containerIndex: null, isContainer: false, itemType: 'FOO' });
    (prisma.container.findUnique as any) = vi.fn().mockResolvedValue({ id: 2, capacity: 1, containerType: 'BASIC' });
    (prisma.item.findFirst as any) = vi.fn().mockResolvedValue(null);
    (prisma.item.update as any) = vi.fn().mockResolvedValue(true);
    (prisma.container.findMany as any) = vi.fn().mockResolvedValue([]);
    const char = { id: 10 } as any;
    // target index 2 exceeds capacity 1 -> should yield status 400
    await expect(inventoryService.moveItemForCharacter(char, { itemId: 6, target: { containerId: 2, localIndex: 2 } })).rejects.toHaveProperty('status', 400);
  });

  it('moveItemForCharacter swaps items within same container', async () => {
    (prisma.item.findUnique as any) = vi.fn().mockResolvedValue({ id: 7, characterId: 11, containerId: 3, containerIndex: 1, isContainer: false });
    (prisma.container.findUnique as any) = vi.fn().mockResolvedValue({ id: 3, capacity: 4, containerType: 'BASIC' });
    (prisma.item.findFirst as any) = vi.fn().mockResolvedValue({ id: 8, containerId: 3, containerIndex: 2 });
    (prisma.$transaction as any) = vi.fn().mockResolvedValue(true);
    (prisma.container.findMany as any) = vi.fn().mockResolvedValue([]);
    const char = { id: 11 } as any;
    const res = await inventoryService.moveItemForCharacter(char, { itemId: 7, target: { containerId: 3, localIndex: 2 } });
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('moveItemForCharacter swaps items between containers', async () => {
    (prisma.item.findUnique as any) = vi.fn().mockResolvedValue({ id: 20, characterId: 30, containerId: 4, containerIndex: 0, isContainer: false });
    (prisma.container.findUnique as any) = vi.fn().mockResolvedValue({ id: 8, capacity: 5, containerType: 'BASIC' });
    (prisma.item.findFirst as any) = vi.fn().mockResolvedValue({ id: 21, containerId: 9, containerIndex: 2 });
    (prisma.$transaction as any) = vi.fn().mockResolvedValue(true);
    (prisma.container.findMany as any) = vi.fn().mockResolvedValue([]);
    const char = { id: 30 } as any;
    const res = await inventoryService.moveItemForCharacter(char, { itemId: 20, target: { containerId: 9, localIndex: 2 } });
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('containerIsDescendantOfItem detects nested ancestry', async () => {
    (prisma.container.findUnique as any) = vi.fn()
      .mockResolvedValueOnce({ itemId: 30 })
      .mockResolvedValueOnce({ itemId: 10 });
    (prisma.item.findUnique as any) = vi.fn().mockResolvedValueOnce({ containerId: 4 });
    const res = await inventoryService.containerIsDescendantOfItem(5, 10);
    expect(res).toBe(true);
    expect(prisma.container.findUnique).toHaveBeenCalledTimes(2);
  });

  it('containerIsDescendantOfItem returns false when chain breaks', async () => {
    (prisma.container.findUnique as any) = vi.fn()
      .mockResolvedValueOnce({ itemId: 30 })
      .mockResolvedValueOnce(null);
    (prisma.item.findUnique as any) = vi.fn().mockResolvedValueOnce({ containerId: null });
    const res = await inventoryService.containerIsDescendantOfItem(5, 10);
    expect(res).toBe(false);
  });

  it('placeItem rejects invalid payload', async () => {
    await expect(inventoryService.placeItem({ id: 1 }, null)).rejects.toHaveProperty('status', 400);
  });

  it('placeItem delegates to equipment service', async () => {
    (prisma.item.findUnique as any) = vi.fn().mockResolvedValue({ id: 1, characterId: 1 });
    (equipmentService.performEquipForCharacter as any) = vi.fn().mockResolvedValue({ ok: true });
    const res = await inventoryService.placeItem(
      { id: 1 },
      { itemId: 1, destination: { type: 'equipment', slotId: 'hand' } }
    );
    expect(equipmentService.performEquipForCharacter).toHaveBeenCalledWith(1, 1, 'hand');
    expect(res).toEqual({ ok: true });
  });

  it('placeItem unequips to container when item is equipped', async () => {
    (prisma.item.findUnique as any) = vi.fn().mockResolvedValue({ id: 2, characterId: 1 });
    (prisma.equipment.findFirst as any) = vi.fn().mockResolvedValue({ characterId: 1 });
    (prisma.container.findMany as any) = vi.fn().mockResolvedValue([{ id: 10, items: [] }]);
    (prisma.equipment.findMany as any) = vi.fn().mockResolvedValue([{ id: 99 }]);
    (equipmentService.unequipItemToContainer as any) = vi.fn().mockResolvedValue({ ok: true });

    const res = await inventoryService.placeItem(
      { id: 1 },
      { itemId: 2, destination: { type: 'container', containerId: 5, index: 0 } }
    );

    expect(equipmentService.unequipItemToContainer).toHaveBeenCalledWith(1, 2, 5, 0);
    expect(res).toEqual({ equipment: [{ id: 99 }], containers: [{ id: 10, items: [] }] });
  });

  it('placeItem moves unequipped item via container flow', async () => {
    (prisma.item.findUnique as any) = vi.fn().mockResolvedValue({
      id: 3,
      characterId: 1,
      containerId: null,
      containerIndex: null,
      isContainer: false,
      itemType: 'BASIC',
    });
    (prisma.equipment.findFirst as any) = vi.fn().mockResolvedValue(null);
    (prisma.container.findUnique as any) = vi.fn().mockResolvedValue({ id: 7, capacity: 5, containerType: 'BASIC' });
    (prisma.item.findFirst as any) = vi.fn().mockResolvedValue(null);
    (prisma.item.update as any) = vi.fn().mockResolvedValue(true);
    (prisma.container.findMany as any) = vi.fn().mockResolvedValue([]);

    const res = await inventoryService.placeItem(
      { id: 1 },
      { itemId: 3, destination: { type: 'container', containerId: 7, localIndex: 2 } }
    );

    expect(prisma.item.update).toHaveBeenCalled();
    expect(res).toEqual({ containers: [] });
  });
});
