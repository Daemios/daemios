import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockTx = {
  equipment: { findUnique: vi.fn(), findFirst: vi.fn(), upsert: vi.fn(), update: vi.fn() },
  item: { findUnique: vi.fn(), update: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), count: vi.fn() },
  container: { findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn(), findMany: vi.fn(), create: vi.fn() },
};

  const mockPrisma: any = {
  character: { findUnique: vi.fn() },
  item: { findUnique: vi.fn() },
  container: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn() },
  equipment: { findMany: vi.fn() },
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

  it('throws CONTAINER_RECORD_NOT_FOUND when item.isContainer=true but no container record', async () => {
    vi.resetModules();
    mockPrisma.character.findUnique.mockResolvedValue({ id: 1 });
  mockPrisma.item.findUnique.mockResolvedValue({ id: 60, characterId: 1, isContainer: true, equipmentSlot: 'PACK' });
    // container.findFirst returns null
    mockPrisma.container.findFirst.mockResolvedValue(null);
  // simulate container.create throwing (e.g., DB constraint) when attempted
  mockPrisma.container.create.mockRejectedValue(new Error('db create failed'));
  // Also ensure the transaction-level create rejects so tx.container.create throws
  mockTx.container.create.mockRejectedValue(new Error('db create failed'));
    const svc = await import('../equipment.service');
    await expect(svc.performEquipForCharacter(1, 60, 'PACK')).rejects.toHaveProperty('code', 'CONTAINER_RECORD_NOT_FOUND');
  });

  it('throws SOURCE_INDEX_OCCUPIED when source index occupied by other item', async () => {
    vi.resetModules();
    mockPrisma.character.findUnique.mockResolvedValue({ id: 1 });
    // item is in a container at index 2
  mockPrisma.item.findUnique.mockResolvedValue({ id: 70, characterId: 1, equipmentSlot: 'PACK', containerId: 300, containerIndex: 2 });
    // container record exists
    mockPrisma.container.findFirst.mockResolvedValue({ id: 300, capacity: 10 });
    // inside transaction: container.findUnique returns src container
  mockTx.container.findUnique.mockResolvedValue({ id: 300, capacity: 10 });
    // simulate there is an old equipped item that will be placed into the source container
    mockTx.equipment.findUnique.mockResolvedValue({ itemId: 999 });
    mockTx.item.findUnique.mockResolvedValue({ id: 999, isContainer: false });
    // occupant at same index but different id
  mockTx.item.findFirst.mockResolvedValue({ id: 777 });
  // ensure itemsInPack will be an array when reached
  mockTx.item.findMany.mockResolvedValue([]);
    const svc = await import('../equipment.service');
    try {
      await svc.performEquipForCharacter(1, 70, 'PACK');
      throw new Error('expected throw');
    } catch (err: any) {
      // log for diagnosis
      // eslint-disable-next-line no-console
      console.log('SOURCE_INDEX_OCCUPIED error ->', err && err.stack ? err.stack : err);
      expect(err).toHaveProperty('code', 'SOURCE_INDEX_OCCUPIED');
    }
  });

  it('throws CANNOT_PLACE_CONTAINER_IN_SELF when moving a container into its descendant', async () => {
    vi.resetModules();
    mockPrisma.character.findUnique.mockResolvedValue({ id: 1 });
    // item to equip
  mockPrisma.item.findUnique.mockResolvedValue({ id: 80, characterId: 1, equipmentSlot: 'PACK', isContainer: true, containerId: null });
    mockPrisma.container.findFirst.mockResolvedValue({ id: 400, itemId: 80 });

    // Inside tx: there is an existing equip (oldItem) that is a container
    // make oldItem present and a container
    mockTx.equipment.findUnique.mockResolvedValue({ itemId: 80 });
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
    try {
      await svc.performEquipForCharacter(1, 80, 'PACK');
      throw new Error('expected throw');
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.log('CANNOT_PLACE_CONTAINER_IN_SELF error ->', err && err.stack ? err.stack : err);
      expect(err).toHaveProperty('code', 'CANNOT_PLACE_CONTAINER_IN_SELF');
    }
  });

  it('throws POCKETS_FULL when no free index in pockets for unequipped old item', async () => {
    vi.resetModules();
    mockPrisma.character.findUnique.mockResolvedValue({ id: 1 });
  mockPrisma.item.findUnique.mockResolvedValue({ id: 90, characterId: 1, equipmentSlot: 'PACK' });
    mockPrisma.container.findFirst.mockResolvedValue({ id: 600, itemId: 90 });

    // Simulate there is an oldItem to unequip and it has no sourceContainer, so pockets will be used
    mockTx.equipment.findUnique.mockResolvedValue({ itemId: 91 });
    mockTx.item.findUnique.mockResolvedValue({ id: 91, isContainer: false });
    // pockets exist with capacity 1 (full)
    const pocketsId = 777;
    mockTx.container.findFirst.mockImplementation(({ where }: any) => {
      if (where && where.name === 'Pockets') return { id: pocketsId, capacity: 1 };
      return null;
    });
    // used indexes fill the pockets (ensure this is returned for queries against pockets)
    mockTx.item.findMany.mockImplementation(({ where }: any) => {
      if (where && where.containerId === pocketsId) return Promise.resolve([{ containerIndex: 0 }]);
      // default for itemsInPack or other queries
      return Promise.resolve([]);
    });

    const svc = await import('../equipment.service');
    try {
      await svc.performEquipForCharacter(1, 90, 'PACK');
      throw new Error('expected throw');
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.log('POCKETS_FULL error ->', err && err.stack ? err.stack : err);
      expect(err).toHaveProperty('code', 'POCKETS_FULL');
    }
  });
});
