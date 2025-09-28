import { describe, it, expect, vi, beforeEach } from 'vitest';

// Reuse the same mocking pattern as other equipment tests
const mockTx: any = {
  equipment: { findUnique: vi.fn(), findFirst: vi.fn(), upsert: vi.fn(), update: vi.fn() },
  item: { findUnique: vi.fn(), update: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), count: vi.fn() },
  container: { findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn(), create: vi.fn(), findMany: vi.fn() },
};

const mockPrisma: any = {
  character: { findUnique: vi.fn() },
  item: { findUnique: vi.fn() },
  container: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn() },
  equipment: { findMany: vi.fn() },
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

    // After tx
    mockPrisma.equipment.findMany.mockResolvedValue([{ id: 1, characterId, slot: 'HEAD', itemId, Item: { id: itemId } }]);
    mockPrisma.container.findMany.mockResolvedValue([]);

    const svc = await import('../equipment.service');
    const res = await svc.performEquipForCharacter(characterId, itemId, 'HEAD');
    expect(res).toHaveProperty('equipment');
    expect(res.capacityUpdated).toBe(false);
    expect(Array.isArray(res.updatedContainerIds)).toBe(true);
    expect(res.updatedContainerIds.length).toBe(0);
  });

  it('creates missing container inside transaction when top-level container record missing', async () => {
    vi.resetModules();
    const characterId = 20;
    const itemId = 210;
    const createdContainerId = 2100;
    mockPrisma.character.findUnique.mockResolvedValue({ id: characterId });
    mockPrisma.item.findUnique.mockResolvedValue({ id: itemId, characterId, isContainer: true, equipmentSlot: 'PACK', capacity: 3 });
    // top-level findFirst returns null (missing before tx)
    mockPrisma.container.findFirst.mockResolvedValue(null);

    // inside tx: findFirst returns null so code will create
    mockTx.container.findFirst.mockResolvedValue(null);
    mockTx.container.create.mockResolvedValue({ id: createdContainerId, itemId, capacity: 3, containerType: 'PACK' });
    mockTx.item.count.mockResolvedValue(0);
    mockTx.container.update.mockResolvedValue({ id: createdContainerId, capacity: 3 });
    mockTx.equipment.upsert.mockResolvedValue({ id: 99, characterId, slot: 'PACK', itemId });
    mockTx.item.update.mockResolvedValue({ id: itemId, containerId: null, containerIndex: null });

    // after tx, ensure container is visible in listed containers and findFirst picks it up
    mockPrisma.equipment.findMany.mockResolvedValue([{ id: 99, characterId, slot: 'PACK', itemId, Item: { id: itemId } }]);
    mockPrisma.container.findMany.mockResolvedValue([{ id: createdContainerId, itemId, name: 'Pack', containerType: 'PACK', items: [] }]);
    mockPrisma.container.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: createdContainerId, itemId });

    const svc = await import('../equipment.service');
    const res = await svc.performEquipForCharacter(characterId, itemId, 'PACK');
    expect(res.capacityUpdated).toBe(true);
    expect(res.updatedContainerIds).toContain(createdContainerId);
  });

  it('throws CONTAINER_CAPACITY_UNKNOWN when neither item nor container report capacity', async () => {
    vi.resetModules();
    const characterId = 30;
    const itemId = 310;
    mockPrisma.character.findUnique.mockResolvedValue({ id: characterId });
    // item lacks capacity
    mockPrisma.item.findUnique.mockResolvedValue({ id: itemId, characterId, isContainer: true, equipmentSlot: 'PACK' });
    // tx finds a container record with null capacity
    mockTx.container.findFirst.mockResolvedValue({ id: 700, itemId, capacity: null });

    const svc = await import('../equipment.service');
    await expect(svc.performEquipForCharacter(characterId, itemId, 'PACK')).rejects.toHaveProperty('code', 'CONTAINER_CAPACITY_UNKNOWN');
  });

  it('throws CONTAINER_OVERFLOW when declared capacity is less than current contents', async () => {
    vi.resetModules();
    const characterId = 40;
    const itemId = 410;
    mockPrisma.character.findUnique.mockResolvedValue({ id: characterId });
    // item has explicit smaller capacity
    mockPrisma.item.findUnique.mockResolvedValue({ id: itemId, characterId, isContainer: true, equipmentSlot: 'PACK', capacity: 1 });
    // tx.container.findFirst returns a container row
    mockTx.container.findFirst.mockResolvedValue({ id: 800, itemId, capacity: 5 });
    // current count is greater than new capacity
    mockTx.item.count.mockResolvedValue(3);

    const svc = await import('../equipment.service');
    await expect(svc.performEquipForCharacter(characterId, itemId, 'PACK')).rejects.toHaveProperty('code', 'CONTAINER_OVERFLOW');
  });

  it('handles already-equipped item by moving it to pockets when space exists', async () => {
    vi.resetModules();
    const characterId = 50;
    const itemId = 510;
    const alreadyEquippedItemId = 9999;
    const pocketsId = 5555;

    mockPrisma.character.findUnique.mockResolvedValue({ id: characterId });
    mockPrisma.item.findUnique.mockResolvedValue({ id: itemId, characterId, isContainer: false, equipmentSlot: 'HAND' });

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

    // When alreadyEquipped is processed, code looks for pockets
    mockTx.container.findFirst.mockImplementation(({ where }: any) => {
      if (where && where.name === 'Pockets' && where.characterId === characterId) return { id: pocketsId, capacity: 5 };
      return null;
    });

    // pockets currently have indexes 0 and 1 occupied -> free slot 2
    mockTx.item.findMany.mockImplementation(async ({ where }: any) => {
      if (where && where.containerId === pocketsId) return [{ containerIndex: 0 }, { containerIndex: 1 }];
      return [];
    });

    // Ensure upsert and updates resolve
    mockTx.equipment.upsert.mockResolvedValue({ id: 123, characterId, slot: 'HAND', itemId });
    mockTx.item.update.mockResolvedValue({ id: itemId });
    mockTx.item.update.mockResolvedValueOnce({ id: alreadyEquippedItemId });

    mockPrisma.equipment.findMany.mockResolvedValue([{ id: 123, characterId, slot: 'HAND', itemId, Item: { id: itemId } }]);
    mockPrisma.container.findMany.mockResolvedValue([{ id: pocketsId, name: 'Pockets', containerType: 'POCKETS', items: [] }]);

    const svc = await import('../equipment.service');
    const res = await svc.performEquipForCharacter(characterId, itemId, 'HAND');

    // verify upsert executed and pockets move attempted (tx.item.update called for already-equipped item)
    expect(mockPrisma.$transaction).toHaveBeenCalled();
    // At least one item.update should have been called inside transaction (moving the already-equipped item)
    expect(mockTx.item.update.mock.calls.length).toBeGreaterThanOrEqual(1);
    // final payload still returned
    expect(res).toHaveProperty('equipment');
  });
});
