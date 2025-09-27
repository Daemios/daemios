import { describe, it, expect, vi, beforeEach } from 'vitest';

// Create a mock prisma with transaction handling. Mock path relative to this file: '../../../db/prisma'
const mockTx: any = {
  equipment: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
  },
  item: {
    findUnique: vi.fn(),
    update: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  },
  container: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
    findMany: vi.fn(),
  },
};

const mockPrisma: any = {
  character: { findUnique: vi.fn() },
  item: { findUnique: vi.fn() },
  container: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn() },
  equipment: { findMany: vi.fn() },
  $transaction: vi.fn(async (cb: any) => cb(mockTx)),
  // the top-level container findFirst should also be available
  // container.findFirst will be stubbed per-test as needed
};

vi.mock('../../../db/prisma', () => ({ prisma: mockPrisma }));

describe('performEquipForCharacter - container equip flow', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('equips a container item, updates capacity and returns annotated payload', async () => {
    // Arrange: character and item exist
    const characterId = 1;
    const itemId = 100;
    const containerId = 200;

    mockPrisma.character.findUnique.mockResolvedValue({ id: characterId });
    // item is a container, belongs to character, capacity defined on item
  mockPrisma.item.findUnique.mockResolvedValue({ id: itemId, characterId, isContainer: true, itemType: 'PACK', equipmentSlot: 'PACK', capacity: 5, containerId: null, containerIndex: null });
    // top-level container.findFirst before tx should find a container record
    mockPrisma.container.findFirst.mockResolvedValue({ id: containerId, itemId });

    // Inside transaction mocks
    mockTx.equipment.findUnique.mockResolvedValue(null); // no current equip
    mockTx.container.findFirst.mockResolvedValue({ id: containerId, capacity: 5, containerType: 'PACK' });
    mockTx.item.count.mockResolvedValue(0);
    mockTx.container.update.mockResolvedValue({ id: containerId, capacity: 5 });
    mockTx.equipment.findFirst.mockResolvedValue(null);
    mockTx.equipment.upsert.mockResolvedValue({ id: 11, characterId, slot: 'PACK', itemId });
    mockTx.item.update.mockResolvedValue({ id: itemId, containerId: null, containerIndex: null });

    // After tx: prisma.equipment.findMany and prisma.container.findMany return values
    mockPrisma.equipment.findMany.mockResolvedValue([{ id: 11, characterId, slot: 'PACK', itemId, Item: { id: itemId } }]);
    mockPrisma.container.findMany.mockResolvedValue([{ id: containerId, name: 'Pack', containerType: 'PACK', items: [] }]);
    // final check for linked container
    mockPrisma.container.findFirst.mockResolvedValueOnce({ id: containerId, itemId }).mockResolvedValueOnce({ id: containerId, itemId });

  // Ensure module mocks are applied freshly
  vi.resetModules();
  const svc = await import('../equipment.service');

    // Act
    const res = await svc.performEquipForCharacter(characterId, itemId, 'PACK');

  // Observables: transaction executed and final payload reflects capacity update
  expect(mockPrisma.$transaction).toHaveBeenCalled();
  expect(res).toHaveProperty('equipment');
  expect(res).toHaveProperty('containers');
  expect(res.capacityUpdated).toBe(true);
  expect(Array.isArray(res.updatedContainerIds)).toBe(true);
  expect(res.updatedContainerIds).toContain(containerId);
  });
});
