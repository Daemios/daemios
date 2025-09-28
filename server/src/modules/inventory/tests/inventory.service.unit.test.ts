import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../db/prisma', () => ({
  prisma: {
    container: { findMany: vi.fn(), findUnique: vi.fn() },
    item: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(),
  },
}));

// Note: the module under test imports prisma from ../../db/prisma; adjust import path resolution used in tests by importing module normally so mocks apply.
import * as inventoryService from '../inventory.service';
import { prisma } from '../../../db/prisma';

describe('inventory.service', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('mapItemForClient returns null on empty', () => {
    expect(inventoryService.mapItemForClient(null)).toBeNull();
  });

  it('iconForContainerType recognizes types', () => {
    expect(inventoryService.iconForContainerType('POCKETS')).toBe('hand');
    expect(inventoryService.iconForContainerType('LIQUID')).toBe('water');
    expect(inventoryService.iconForContainerType(null)).toBeNull();
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
});
