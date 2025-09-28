import { describe, it, expect, vi, beforeEach } from 'vitest';

// minimal prisma tx mock for this specific scenario
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

describe('performEquipForCharacter - swapping backpacks preserves source slot', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockPrisma.$transaction = vi.fn(async (cb: any) => { return await cb(mockTx); });
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

  it('places old backpack into original pockets index when new backpack was equipped from pockets', async () => {
    vi.resetModules();
    const characterId = 9001;
    const newBackpackId = 9002; // item being equipped
    const oldBackpackId = 9003; // currently equipped
    const pocketsId = 7007;
    const pocketsIndex = 0;

    mockPrisma.character.findUnique.mockResolvedValue({ id: characterId });

    // Pre-tx lookup for the incoming item: simulate it came from pockets index 0
    mockPrisma.item.findUnique.mockResolvedValueOnce({ id: newBackpackId, characterId, isContainer: true, equipmentSlot: 'PACK', containerId: pocketsId, containerIndex: pocketsIndex })
      .mockResolvedValueOnce({ id: newBackpackId, characterId, isContainer: true, equipmentSlot: 'PACK', containerId: null });

    // Inside transaction: there is an existing equipped backpack item
    mockTx.equipment.findUnique.mockResolvedValue({ id: 11, itemId: oldBackpackId });

    // tx.item.findUnique should return the moving item when asked inside tx
    mockTx.item.findUnique.mockImplementation(async ({ where }: any) => {
      if (where && where.id === newBackpackId) return { id: newBackpackId, containerId: pocketsId, containerIndex: pocketsIndex };
      if (where && where.id === oldBackpackId) return { id: oldBackpackId, isContainer: true };
      return null;
    });

    // Ensure container lookups resolve
    mockTx.container.findFirst.mockResolvedValue({ id: pocketsId, name: 'Pockets', capacity: 10 });

    // Expect the tx to update the existing equipped item into the pockets slot
    mockTx.item.update.mockImplementation(async ({ where, data }: any) => {
      if (where && where.id === oldBackpackId) return { id: oldBackpackId, containerId: data.containerId ?? null, containerIndex: data.containerIndex ?? null };
      if (where && where.id === newBackpackId) return { id: newBackpackId };
      return null;
    });

    mockTx.equipment.upsert.mockResolvedValue({ id: 99, characterId, slot: 'PACK', itemId: newBackpackId });

    // tx-level final reads
    mockTx.equipment.findMany.mockResolvedValue([{ id: 99, characterId, slot: 'PACK', itemId: newBackpackId, Item: { id: newBackpackId } }]);
    mockTx.container.findMany.mockResolvedValue([{ id: pocketsId, name: 'Pockets', items: [{ containerIndex: pocketsIndex }] }]);

    // after tx readers
    mockPrisma.equipment.findMany.mockResolvedValue([{ id: 99, characterId, slot: 'PACK', itemId: newBackpackId, Item: { id: newBackpackId } }]);
    mockPrisma.container.findMany.mockResolvedValue([{ id: pocketsId, name: 'Pockets', items: [{ containerIndex: pocketsIndex }] }]);

    const svc = await import('../equipment.service');
    const res = await svc.performEquipForCharacter(characterId, newBackpackId, 'PACK');

    expect(res).toHaveProperty('equipment');
    // Verify that tx.item.update was called to place old backpack into pockets index
    const calls = mockTx.item.update.mock.calls;
    const oldUpdate = calls.find((c: any) => c[0].where && c[0].where.id === oldBackpackId);
    expect(oldUpdate).toBeTruthy();
    expect(oldUpdate[0].data).toEqual({ containerId: pocketsId, containerIndex: pocketsIndex });
  });
});
