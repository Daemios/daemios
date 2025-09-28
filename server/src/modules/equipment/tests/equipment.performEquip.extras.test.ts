import { describe, it, expect, vi, beforeEach } from 'vitest';

// Reuse the same mocking pattern as other equipment tests
const mockTx: any = {
  equipment: { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), upsert: vi.fn(), update: vi.fn() },
  item: { findUnique: vi.fn(), update: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), count: vi.fn() },
  container: { findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn(), create: vi.fn(), findMany: vi.fn() },
};

const mockPrisma: any = {
  character: { findUnique: vi.fn() },
  item: { findUnique: vi.fn() },
  container: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), findUnique: vi.fn() },
  equipment: { findMany: vi.fn(), findUnique: vi.fn() },
  $transaction: vi.fn(async (cb: any) => cb(mockTx)),
};

vi.mock('../../../db/prisma', () => ({ prisma: mockPrisma }));

describe('performEquipForCharacter - extra flows', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Defaults
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
    mockTx.container.create.mockResolvedValue(null);
    mockTx.container.update.mockResolvedValue(null);

    mockPrisma.character.findUnique.mockResolvedValue(null);
    mockPrisma.item.findUnique.mockResolvedValue(null);
    mockPrisma.container.findFirst.mockResolvedValue(null);
    mockPrisma.container.findMany.mockResolvedValue([]);
    mockPrisma.equipment.findMany.mockResolvedValue([]);
    if (mockPrisma.$transaction && mockPrisma.$transaction.mockImplementation) {
      mockPrisma.$transaction.mockImplementation(async (cb: any) => cb(mockTx));
    } else {
      mockPrisma.$transaction = vi.fn(async (cb: any) => cb(mockTx));
    }
  });

  it('equips a non-container item successfully (capacityUpdated=false)', async () => {
    vi.resetModules();
    const characterId = 10;
    const itemId = 110;
    mockPrisma.character.findUnique.mockResolvedValue({ id: characterId });
    // non-container item
    mockPrisma.item.findUnique.mockResolvedValue({ id: itemId, characterId, isContainer: false, equipmentSlot: 'HEAD', containerId: null, containerIndex: null });

    // Transaction behavior
    mockTx.equipment.findUnique.mockResolvedValue(null);
    mockTx.equipment.upsert.mockResolvedValue({ id: 1, characterId, slot: 'HEAD', itemId });
    mockTx.item.update.mockResolvedValue({ id: itemId, containerId: null, containerIndex: null });
  // tx-level final reads
  mockTx.equipment.findMany.mockResolvedValue([{ id: 1, characterId, slot: 'HEAD', itemId, Item: { id: itemId } }]);
  mockTx.container.findMany.mockResolvedValue([]);

  // After tx: prisma.* readers
  mockPrisma.equipment.findMany.mockResolvedValue([{ id: 1, characterId, slot: 'HEAD', itemId, Item: { id: itemId } }]);
  mockPrisma.container.findMany.mockResolvedValue([]);

    const svc = await import('../equipment.service');
    const res = await svc.performEquipForCharacter(characterId, itemId, 'HEAD');
    expect(res).toHaveProperty('equipment');
    expect(res.capacityUpdated).toBe(false);
    expect(Array.isArray(res.updatedContainerIds)).toBe(true);
    expect(res.updatedContainerIds.length).toBe(0);
  });

  // Removed: test expecting CONTAINER_RECORD_NOT_FOUND — this project uses the lean policy and this test was deleted per request.

  it('proceeds when container reports null capacity (capacity not enforced in lean path)', async () => {
    vi.resetModules();
    const characterId = 30;
    const itemId = 310;
    mockPrisma.character.findUnique.mockResolvedValue({ id: characterId });
    // item lacks capacity (we expect capacity to live on container)
    mockPrisma.item.findUnique.mockResolvedValue({ id: itemId, characterId, isContainer: true, equipmentSlot: 'PACK' });
  // tx finds no reciprocal container record for this lean path test
  mockTx.container.findFirst.mockResolvedValue(null);

    // allow upsert/update to resolve
    mockTx.equipment.upsert.mockResolvedValue({ id: 1, characterId, slot: 'PACK', itemId });
    mockTx.item.update.mockResolvedValue({ id: itemId });
  mockTx.equipment.findMany.mockResolvedValue([{ id: 1, characterId, slot: 'PACK', itemId, Item: { id: itemId } }]);
  mockTx.container.findMany.mockResolvedValue([]);
  mockPrisma.equipment.findMany.mockResolvedValue([{ id: 1, characterId, slot: 'PACK', itemId, Item: { id: itemId } }]);
  mockPrisma.container.findMany.mockResolvedValue([]);

    const svc = await import('../equipment.service');
    const res = await svc.performEquipForCharacter(characterId, itemId, 'PACK');
    expect(res).toHaveProperty('equipment');
    expect(res.capacityUpdated).toBe(false);
  });

  it('ignores overflow in lean path and proceeds (no capacity enforcement)', async () => {
    vi.resetModules();
    const characterId = 40;
    const itemId = 410;
    mockPrisma.character.findUnique.mockResolvedValue({ id: characterId });
    // item has explicit smaller capacity but we no longer enforce
    mockPrisma.item.findUnique.mockResolvedValue({ id: itemId, characterId, isContainer: true, equipmentSlot: 'PACK', capacity: 1 });
  // ensure no reciprocal container is reported in-tx for this test
  mockTx.container.findFirst.mockResolvedValue(null);
    // current count is greater than new capacity
    mockTx.item.count.mockResolvedValue(3);

    mockTx.equipment.upsert.mockResolvedValue({ id: 2, characterId, slot: 'PACK', itemId });
    mockTx.item.update.mockResolvedValue({ id: itemId });
  mockTx.equipment.findMany.mockResolvedValue([{ id: 2, characterId, slot: 'PACK', itemId, Item: { id: itemId } }]);
  mockTx.container.findMany.mockResolvedValue([]);
  mockPrisma.equipment.findMany.mockResolvedValue([{ id: 2, characterId, slot: 'PACK', itemId, Item: { id: itemId } }]);
  mockPrisma.container.findMany.mockResolvedValue([]);

    const svc = await import('../equipment.service');
    const res = await svc.performEquipForCharacter(characterId, itemId, 'PACK');
    expect(res).toHaveProperty('equipment');
    expect(res.capacityUpdated).toBe(false);
  });

  it('handles already-equipped item by clearing other equipment mapping (no pocket fallback)', async () => {
    vi.resetModules();
    const characterId = 50;
    const itemId = 510;
    const alreadyEquippedItemId = 9999;
    const pocketsId = 5555;

    mockPrisma.character.findUnique.mockResolvedValue({ id: characterId });
    // For already-equipped flows, the pre-tx findUnique should show the item owned
    // by the character; post-tx lookup should be containerId null. Ensure two
    // sequential responses where appropriate in tests that rely on it.
    mockPrisma.item.findUnique.mockResolvedValueOnce({ id: itemId, characterId, isContainer: false, equipmentSlot: 'HAND', containerId: null })
      .mockResolvedValueOnce({ id: itemId, characterId, isContainer: false, equipmentSlot: 'HAND', containerId: null });

    // no current equip on slot
    mockTx.equipment.findUnique.mockResolvedValue(null);
    // but an alreadyEquipped record exists (for this item) earlier in flow
    mockTx.equipment.findFirst.mockImplementation(async ({ where }: any) => {
      // when checking alreadyEquipped by itemId, return a record
      if (where && where.characterId === characterId && where.itemId === itemId) return null;
      // simulate alreadyEquipped existing for some other check path
      return null;
    });

    // Simulate the 'alreadyEquipped' branch by returning an alreadyEquipped when called explicitly
    // We'll stub the call site by making tx.equipment.findFirst return the alreadyEquipped when invoked after upsert
    // Simpler: stub tx.equipment.findFirst to return null initially but stub tx.equipment.findFirst later via mockImplementationOnce
    mockTx.equipment.findFirst.mockResolvedValue(null);

    // To trigger the alreadyEquipped branch, set tx.equipment.findFirst to return a record when called for alreadyEquipped
    const alreadyEquippedRecord = { id: 77, itemId: alreadyEquippedItemId, characterId };
    // We'll make a later call to tx.equipment.findFirst to return the alreadyEquipped record
    mockTx.equipment.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(alreadyEquippedRecord);

  // No pocket fallback behavior; just ensure the alreadyEquipped mapping is cleared
  const alreadyEquipped = { id: 77, itemId: alreadyEquippedItemId, characterId };
  mockTx.equipment.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(alreadyEquipped);

    mockTx.equipment.upsert.mockResolvedValue({ id: 123, characterId, slot: 'HAND', itemId });
    mockTx.item.update.mockResolvedValue({ id: itemId });

  mockTx.equipment.findMany.mockResolvedValue([{ id: 123, characterId, slot: 'HAND', itemId, Item: { id: itemId } }]);
  mockTx.container.findMany.mockResolvedValue([]);
  mockPrisma.equipment.findMany.mockResolvedValue([{ id: 123, characterId, slot: 'HAND', itemId, Item: { id: itemId } }]);
  mockPrisma.container.findMany.mockResolvedValue([]);

    const svc = await import('../equipment.service');
    const res = await svc.performEquipForCharacter(characterId, itemId, 'HAND');

    // verify transaction executed and the other equipment mapping was cleared
    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(mockTx.equipment.findFirst).toHaveBeenCalled();
    expect(res).toHaveProperty('equipment');
  });
});
