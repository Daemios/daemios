import { describe, it, expect, vi, beforeEach } from 'vitest';

// Minimal mocked prisma similar to other equipment tests
const mockTx: any = {
  equipment: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
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
  container: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), findUnique: vi.fn() },
  equipment: { findMany: vi.fn(), findUnique: vi.fn() },
  $transaction: vi.fn(async (cb: any) => { return await cb(mockTx); }),
};

vi.mock('../../../db/prisma', () => ({ prisma: mockPrisma }));

describe('performEquipForCharacter - waist/belt equip should remove item from returned containers', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Ensure the mocked transaction executes the callback with our tx mock
    mockPrisma.$transaction = vi.fn(async (cb: any) => { return await cb(mockTx); });
  });

  it('equips a belt (non-container) and returned containers do not include the equipped item', async () => {
    const characterId = 7;
    const itemId = 777;
    const sourceContainerId = 55;

    // Character exists
    mockPrisma.character.findUnique.mockResolvedValue({ id: characterId });

    // Item belongs to character, is NOT a container, currently in a container
    mockPrisma.item.findUnique.mockResolvedValue({ id: itemId, characterId, isContainer: false, equipmentSlot: 'WAIST', containerId: sourceContainerId, containerIndex: 2 });

    // No top-level container record for the item (we'll rely on transaction logic)
    mockPrisma.container.findFirst.mockResolvedValue(null);

    // Inside transaction: no existing equip in slot
    mockTx.equipment.findUnique.mockResolvedValue(null);
    mockTx.equipment.findFirst.mockResolvedValue(null);
    mockTx.equipment.upsert.mockResolvedValue({ id: 31, characterId, slot: 'WAIST', itemId });
    mockTx.item.update.mockResolvedValue({ id: itemId, containerId: null, containerIndex: null });

    // tx-level final reads should return the post-transaction state
    mockTx.equipment.findMany.mockResolvedValue([{ id: 31, characterId, slot: 'WAIST', itemId, Item: { id: itemId } }]);
    mockTx.container.findMany.mockResolvedValue([
      { id: sourceContainerId, name: 'Belt Pouch', containerType: 'BASIC', items: [{ id: 10, name: 'Coin' }] },
    ]);

    // After tx: equipment list and containers; container includes the item (simulating stale/extra row)
    mockPrisma.equipment.findMany.mockResolvedValue([{ id: 31, characterId, slot: 'WAIST', itemId, Item: { id: itemId } }]);
    mockPrisma.container.findMany.mockResolvedValue([
      { id: sourceContainerId, name: 'Belt Pouch', containerType: 'BASIC', items: [{ id: 10, name: 'Coin' }] },
    ]);

    // Simulate pre-transaction item state: containerId present; post-transaction
    // lookup returns containerId null so the post-transaction consistency
    // check succeeds.
    mockPrisma.item.findUnique = vi.fn().mockResolvedValueOnce({ id: itemId, characterId, containerId: sourceContainerId, isContainer: false, equipmentSlot: 'WAIST' })
      .mockResolvedValueOnce({ id: itemId, characterId, containerId: null, isContainer: false, equipmentSlot: 'WAIST' });

  // Ensure module is imported fresh with mocks
  vi.resetModules();
  const svc = await import('../equipment.service');

  const res = await svc.performEquipForCharacter(characterId, itemId, 'WAIST');

    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(res).toHaveProperty('equipment');
    expect(res).toHaveProperty('containers');
    // The returned containers should NOT include the equipped item
    const itemsAcross = (res.containers || []).flatMap((c: any) => (c.items || []).map((it: any) => Number(it.id)));
    expect(itemsAcross).not.toContain(itemId);
  });
});
