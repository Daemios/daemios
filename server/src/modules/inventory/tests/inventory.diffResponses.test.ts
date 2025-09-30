import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../db/prisma', () => ({
  prisma: {
    container: { findMany: vi.fn(), findUnique: vi.fn() },
    item: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn(), count: vi.fn() },
    equipment: { findFirst: vi.fn(), findMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

import * as inventoryService from '../inventory.service';
import { prisma } from '../../../db/prisma';

describe('inventory diff-shaped responses', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns updatedContainerIds and partial container slots when moving an item', async () => {
    // Arrange: simulate moving an unequipped item into container id 42 at index 1
    (prisma.item.findUnique as any) = vi.fn().mockResolvedValue({ id: 100, characterId: 1, containerId: null, containerIndex: null });
    (prisma.equipment.findFirst as any) = vi.fn().mockResolvedValue(null);
    (prisma.container.findUnique as any) = vi.fn().mockResolvedValue({ id: 42, capacity: 10, containerType: 'BASIC' });
    (prisma.item.findFirst as any) = vi.fn().mockResolvedValue(null);
    (prisma.item.update as any) = vi.fn().mockResolvedValue(true);
    // after update, fetchContainersWithItems should return at least the updated container
    (prisma.container.findMany as any) = vi.fn().mockResolvedValue([
      { id: 42, label: 'Bag', capacity: 10, containerType: 'BASIC', items: [{ id: 100, containerIndex: 1 }] },
    ]);

    const res = await inventoryService.placeItem({ id: 1 }, { itemId: 100, destination: { type: 'container', containerId: 42, localIndex: 1 } });

    // Expect the result to include containers and updatedContainerIds (breaking diff shape)
    expect(res).toHaveProperty('containers');
    expect(res).toHaveProperty('updatedContainerIds');
    expect(Array.isArray(res.updatedContainerIds)).toBe(true);
    expect(res.updatedContainerIds).toContain(42);
    // containers should be an array (service returns containers array); controller wraps into partial map later
    expect(Array.isArray(res.containers)).toBe(true);
  });

  it('rejects invalid payload in placeItem (negative)', async () => {
    await expect(inventoryService.placeItem({ id: 1 }, null)).rejects.toHaveProperty('status', 400);
  });
});
