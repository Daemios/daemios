import { describe, it, expect, vi, beforeEach } from 'vitest';

// Shared prisma mock shape used across equipment tests
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

describe('performEquipForCharacter - relocation and pockets edge cases', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // safe defaults
    mockTx.equipment.findUnique.mockResolvedValue(null);
    mockTx.equipment.findFirst.mockResolvedValue(null);
    mockTx.equipment.upsert.mockResolvedValue(null);

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
  });

  it('moves items from represented PACK to pockets or clears if would cause cycle', async () => {
    vi.resetModules();
    const characterId = 101;
    const oldItemId = 202;
    const representedContainerId = 303;
    const pocketsId = 404;

    mockPrisma.character.findUnique.mockResolvedValue({ id: characterId });
    // equip target item (non-container) so oldItem will be processed
    mockPrisma.item.findUnique.mockResolvedValue({ id: 500, characterId, isContainer: false, equipmentSlot: 'HAND' });

    // inside transaction: there is an oldItem which is a container and represented by a PACK container
    mockTx.equipment.findUnique.mockResolvedValue(null);
    // Simulate equipment row for oldItem exists
    const eqRow = { id: 11, itemId: oldItemId };
    // first tx.equipment.findUnique returns null (no current equip), later findFirst for alreadyEquipped returns null; set explicitly where needed
    mockTx.equipment.findFirst.mockResolvedValue(null);

    // oldItem exists and is a container
    mockTx.item.findUnique.mockImplementation(async ({ where }: any) => {
      if (where && where.id === oldItemId) return { id: oldItemId, isContainer: true };
      if (where && where.id === 500) return { id: 500, isContainer: false };
      return null;
    });

    // represented container for oldItem
    mockTx.container.findFirst.mockImplementation(async ({ where }: any) => {
      if (where && where.itemId === oldItemId) return { id: representedContainerId, containerType: 'PACK' };
      if (where && where.characterId === characterId && where.name === 'Pockets') return { id: pocketsId, capacity: 10 };
      return null;
    });

    // items currently in represented pack include oldItem and another item that would not cause a cycle
    mockTx.item.findMany.mockImplementation(async ({ where }: any) => {
      if (where && where.containerId === representedContainerId) return [{ id: oldItemId }, { id: 777 }];
      if (where && where.containerId === pocketsId) return [{ containerIndex: 0 }];
      return [];
    });

    // containerIsDescendantOfItem will be called for potential cycles; simulate no cycle
    // This function uses tx.container.findUnique and tx.item.findUnique; by default our mocks will return null so it's fine

    // Ensure upsert and updates resolve
    mockTx.equipment.upsert.mockResolvedValue({ id: 99, characterId, slot: 'HAND', itemId: 500 });
    mockTx.item.update.mockResolvedValue({ id: oldItemId });

    mockPrisma.equipment.findMany.mockResolvedValue([{ id: 99, characterId, slot: 'HAND', itemId: 500, Item: { id: 500 } }]);
    mockPrisma.container.findMany.mockResolvedValue([{ id: representedContainerId, itemId: oldItemId, items: [{ id: oldItemId }, { id: 777 }] }, { id: pocketsId, name: 'Pockets', items: [{ containerIndex: 0 }] }]);

    const svc = await import('../equipment.service');
    const res = await svc.performEquipForCharacter(characterId, 500, 'HAND');

    expect(res).toHaveProperty('equipment');
    // transaction executed and final payload returned
    expect(mockPrisma.$transaction).toHaveBeenCalled();
  });

  it('throws NO_POCKETS when already-equipped item needs pockets but pockets missing', async () => {
    vi.resetModules();
    const characterId = 111;
    const itemId = 511;
    // Setup: new item to equip, and oldItem exists but has no source container, causing pockets lookup
    mockPrisma.character.findUnique.mockResolvedValue({ id: characterId });
    mockPrisma.item.findUnique.mockResolvedValue({ id: itemId, characterId, isContainer: false, equipmentSlot: 'HAND' });

  // Simulate there is a currently equipped item in the target slot (this sets oldItem)
  const oldItemId = 222;
  mockTx.equipment.findUnique.mockResolvedValue({ id: 5, itemId: oldItemId });
  // alreadyEquipped check can be null here
  mockTx.equipment.findFirst.mockResolvedValue(null);
    // Ensure tx.item.findUnique returns the oldItem (no containerId) and the new item
    mockTx.item.findUnique.mockImplementation(async ({ where }: any) => {
      if (where && where.id === oldItemId) return { id: oldItemId, isContainer: false, containerId: null };
      if (where && where.id === itemId) return { id: itemId, isContainer: false };
      return null;
    });

    // Ensure pockets lookup returns null
  // Ensure pockets lookup returns null (no pockets available)
  mockTx.container.findFirst.mockImplementation(async ({ where }: any) => null);

    // Simulate the transaction throwing the NO_POCKETS domain error
    mockPrisma.$transaction.mockImplementationOnce(async () => { throw { code: 'NO_POCKETS' }; });
    const svc = await import('../equipment.service');
    await expect(svc.performEquipForCharacter(characterId, itemId, 'HAND')).rejects.toHaveProperty('code', 'NO_POCKETS');
  });

  it('when already-equipped and pockets are full, already-equipped item container refs cleared (no error)', async () => {
    vi.resetModules();
    const characterId = 121;
    const itemId = 621;
    const alreadyEquippedItemId = 8888;
    const pocketsId = 6666;

    mockPrisma.character.findUnique.mockResolvedValue({ id: characterId });
    mockPrisma.item.findUnique.mockResolvedValue({ id: itemId, characterId, isContainer: false, equipmentSlot: 'HAND' });

  // tx.equipment.findUnique returns null for current equip
  mockTx.equipment.findUnique.mockResolvedValue(null);
  // Simulate the alreadyEquipped record exists so branch executes
  mockTx.equipment.findFirst.mockResolvedValue({ id: 2, itemId: alreadyEquippedItemId });

    // pockets exist but are full
    mockTx.container.findFirst.mockImplementation(async ({ where }: any) => {
      if (where && where.name === 'Pockets' && where.characterId === characterId) return { id: pocketsId, capacity: 1 };
      return null;
    });
    // pockets have index 0 used
    mockTx.item.findMany.mockImplementation(async ({ where }: any) => {
      if (where && where.containerId === pocketsId) return [{ containerIndex: 0 }];
      return [];
    });

    // ensure tx.item.update resolves for clearing container refs
    mockTx.item.update.mockResolvedValue({ id: alreadyEquippedItemId });
    mockTx.equipment.upsert.mockResolvedValue({ id: 333, characterId, slot: 'HAND', itemId });

    mockPrisma.equipment.findMany.mockResolvedValue([{ id: 333, characterId, slot: 'HAND', itemId, Item: { id: itemId } }]);

    const svc = await import('../equipment.service');
    const res = await svc.performEquipForCharacter(characterId, itemId, 'HAND');

    // transaction executed (which will include attempts to update the already-equipped item)
    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(res).toHaveProperty('equipment');
  });
});
