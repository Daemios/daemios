import { describe, it, expect, vi, beforeEach } from 'vitest';

// stub prisma used by the service module
const mockPrisma: any = {
  equipment: {
    upsert: vi.fn(),
    findUnique: vi.fn(),
    delete: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  item: {
    findUnique: vi.fn(),
    update: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  },
  character: { findUnique: vi.fn() },
  container: { findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn(), findMany: vi.fn(), create: vi.fn() },
  $transaction: vi.fn(async (cb: any) => cb({
    equipment: mockPrisma.equipment,
    item: mockPrisma.item,
    container: mockPrisma.container,
  })),
};

// Mock the prisma module import used by the service file. The correct relative path from this test to server/src/db/prisma is '../../../db/prisma'.
vi.mock('../../../db/prisma', () => ({ prisma: mockPrisma }));

describe('equipment.service basic ops (mocked prisma)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('equipItemToCharacter calls prisma.upsert and returns value', async () => {
    const svc = await import('../equipment.service');
    mockPrisma.equipment.upsert.mockResolvedValue({ id: 1, characterId: 2, slot: 'HEAD', itemId: 5 });
    const out = await svc.equipItemToCharacter(2, 5, 'HEAD' as any);
    expect(mockPrisma.equipment.upsert).toHaveBeenCalled();
    expect(out).toEqual({ id: 1, characterId: 2, slot: 'HEAD', itemId: 5 });
  });

  it('unequipItemFromSlot deletes existing row and returns it', async () => {
    const svc = await import('../equipment.service');
    mockPrisma.equipment.findUnique.mockResolvedValue({ id: 10, characterId: 3, slot: 'HAND', itemId: 7 });
    mockPrisma.equipment.delete.mockResolvedValue({ id: 10 });
    const out = await svc.unequipItemFromSlot(3, 'HAND' as any);
    expect(mockPrisma.equipment.findUnique).toHaveBeenCalled();
    expect(mockPrisma.equipment.delete).toHaveBeenCalledWith({ where: { id: 10 } });
    expect(out).toEqual({ id: 10, characterId: 3, slot: 'HAND', itemId: 7 });
  });

  it('listEquipmentForCharacter forwards to prisma.findMany', async () => {
    const svc = await import('../equipment.service');
    mockPrisma.equipment.findMany.mockResolvedValue([{ id: 3 }]);
    const out = await svc.listEquipmentForCharacter(4);
    expect(mockPrisma.equipment.findMany).toHaveBeenCalledWith({ where: { characterId: 4 }, include: { Item: true } });
    expect(out).toEqual([{ id: 3 }]);
  });
});
