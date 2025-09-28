import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockTx = {
  equipment: { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), upsert: vi.fn(), update: vi.fn() },
  item: { findUnique: vi.fn(), update: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), count: vi.fn() },
  container: { findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn(), findMany: vi.fn(), create: vi.fn() },
};

  const mockPrisma: any = {
  character: { findUnique: vi.fn() },
  item: { findUnique: vi.fn() },
  container: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn() },
  equipment: { findMany: vi.fn(), findUnique: vi.fn() },
  $transaction: vi.fn(async (cb: any) => cb(mockTx)),
};

vi.mock('../../../db/prisma', () => ({ prisma: mockPrisma }));

// We assert on the thrown error's `code` property rather than instanceof DomainError

describe('performEquipForCharacter negative flows', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Provide safe defaults so transactional lookups resolve to empty arrays/nulls
    mockTx.equipment.findUnique.mockResolvedValue(null);
    mockTx.equipment.findFirst.mockResolvedValue(null);
    mockTx.equipment.upsert.mockResolvedValue(null);
    mockTx.equipment.update.mockResolvedValue(null);

    mockTx.item.findUnique.mockResolvedValue(null);
    mockTx.item.findFirst.mockResolvedValue(null);
    mockTx.item.findMany.mockResolvedValue([]);
    mockTx.item.update.mockResolvedValue(null);
    mockTx.item.count.mockResolvedValue(0);

    mockTx.container.findFirst.mockResolvedValue(null);
    mockTx.container.findUnique.mockResolvedValue(null);
    mockTx.container.findMany.mockResolvedValue([]);
    mockTx.container.update.mockResolvedValue(null);

    mockPrisma.character.findUnique.mockResolvedValue(null);
    mockPrisma.item.findUnique.mockResolvedValue(null);
    mockPrisma.container.findFirst.mockResolvedValue(null);
    mockPrisma.container.findMany.mockResolvedValue([]);
    mockPrisma.equipment.findMany.mockResolvedValue([]);
  mockPrisma.equipment.findUnique.mockResolvedValue(null);
    // Ensure $transaction executes the callback with our mockTx
    if (mockPrisma.$transaction && mockPrisma.$transaction.mockImplementation) {
      mockPrisma.$transaction.mockImplementation(async (cb: any) => cb(mockTx));
    } else {
      mockPrisma.$transaction = vi.fn(async (cb: any) => cb(mockTx));
    }
  });

  it('throws ITEM_NOT_OWNED when item.characterId !== characterId', async () => {
    vi.resetModules();
    mockPrisma.character.findUnique.mockResolvedValue({ id: 1 });
    mockPrisma.item.findUnique.mockResolvedValue({ id: 50, characterId: 2 });
    const svc = await import('../equipment.service');
    await expect(svc.performEquipForCharacter(1, 50, 'HEAD')).rejects.toHaveProperty('code', 'ITEM_NOT_OWNED');
  });

  it('throws INVALID_SLOT when item.equipmentSlot does not match target slot', async () => {
    vi.resetModules();
    mockPrisma.character.findUnique.mockResolvedValue({ id: 1 });
    mockPrisma.item.findUnique.mockResolvedValue({ id: 51, characterId: 1, equipmentSlot: 'HEAD' });
    const svc = await import('../equipment.service');
    await expect(svc.performEquipForCharacter(1, 51, 'PACK')).rejects.toHaveProperty('code', 'INVALID_SLOT');
  });

  // Removed: CONTAINER_RECORD_NOT_FOUND negative test (handled by lean policy)

  // Removed: SOURCE_INDEX_OCCUPIED negative test (deleted per request)

  it('throws CANNOT_PLACE_CONTAINER_IN_SELF when moving a container into its descendant', async () => {
    vi.resetModules();
    mockPrisma.character.findUnique.mockResolvedValue({ id: 1 });
    // item to equip
  mockPrisma.item.findUnique.mockResolvedValue({ id: 80, characterId: 1, equipmentSlot: 'PACK', isContainer: true, containerId: null });
    mockPrisma.container.findFirst.mockResolvedValue({ id: 400, itemId: 80 });

  // Inside tx: there is an existing equip (oldItem) that is a container
  // make oldItem present and a container and set its containerId so the
  // transitive descendant check has a starting point (targetContainerId)
  mockTx.equipment.findUnique.mockResolvedValue({ itemId: 80, containerId: 400 });
    mockTx.item.findUnique.mockResolvedValue({ id: 80, isContainer: true });
  // when checking descendant, tx.container.findUnique for the target returns an object whose itemId equals oldItem.id -> wouldDescend true
  mockTx.container.findUnique.mockResolvedValue({ itemId: 80 });
  // make represented container be a PACK and ensure pockets exist with free capacity so we get past pockets fullness
  mockTx.container.findFirst.mockImplementation(({ where }: any) => {
    if (where && where.name === 'Pockets') return { id: 500, capacity: 4 };
  if (where && where.itemId === 80) return { id: 400, containerType: 'PACK' };
    return null;
  });
  mockTx.item.findMany.mockResolvedValue([]);
    // containerIsDescendantOfItem will call tx.container.findUnique and see itemId === oldItem.id, so we simulate that by having findUnique return itemId equal to oldItem id

    const svc = await import('../equipment.service');
    await expect(svc.performEquipForCharacter(1, 80, 'PACK')).rejects.toHaveProperty('code', 'CANNOT_PLACE_CONTAINER_IN_SELF');
  });

  // Removed: POCKETS_FULL negative test (deleted per request)
});
