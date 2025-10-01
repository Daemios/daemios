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

const swapEquipmentAndContainerMock = vi.fn();

vi.mock('../equipment.domain', async () => {
  const actual = await vi.importActual<any>('../equipment.domain');
  return {
    ...actual,
    swapEquipmentAndContainer: swapEquipmentAndContainerMock,
  };
});

describe('equipment.service basic ops (mocked prisma)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    swapEquipmentAndContainerMock.mockReset();
    mockPrisma.$transaction.mockImplementation(async (cb: any) => cb({
      equipment: mockPrisma.equipment,
      item: mockPrisma.item,
      container: mockPrisma.container,
    }));
  });

  it('listEquipmentForCharacter forwards to prisma.findMany', async () => {
    const svc = await import('../equipment.service');
    mockPrisma.equipment.findMany.mockResolvedValue([{ id: 3 }]);
    const out = await svc.listEquipmentForCharacter(4);
    expect(mockPrisma.equipment.findMany).toHaveBeenCalledWith({ where: { characterId: 4 }, include: { Item: true } });
    expect(out).toEqual([{ id: 3 }]);
  });

  it('unequipItemToContainer places an item into an empty destination', async () => {
    const svc = await import('../equipment.service');
    mockPrisma.item.findUnique.mockResolvedValueOnce({ id: 15, characterId: 9 });
    mockPrisma.equipment.findFirst.mockResolvedValueOnce({ id: 77, slot: 'HEAD', itemId: 15 });
    mockPrisma.item.findFirst.mockResolvedValueOnce(null);
    mockPrisma.equipment.update.mockResolvedValue({ id: 77, itemId: null });
    mockPrisma.item.update.mockResolvedValueOnce({ id: 15, containerId: 30, containerIndex: 2 });

    const result = await svc.unequipItemToContainer(9, 15, 30, 2);

    expect(result).toEqual({
      item: { id: 15, containerId: 30, containerIndex: 2 },
      changed: [
        { type: 'equipment', slot: 'HEAD', oldItemId: 15, newItemId: null },
        { type: 'container', containerId: 30, index: 2, oldItemId: null, newItemId: 15 },
      ],
    });
    expect(mockPrisma.equipment.update).toHaveBeenCalledWith({ where: { id: 77 }, data: { itemId: null } });
    expect(mockPrisma.item.update).toHaveBeenLastCalledWith({ where: { id: 15 }, data: { containerId: 30, containerIndex: 2 } });
  });

  it('unequipItemToContainer swaps with occupying item when destination is taken', async () => {
    const svc = await import('../equipment.service');
    mockPrisma.item.findUnique.mockResolvedValueOnce({ id: 21, characterId: 5 });
    mockPrisma.equipment.findFirst.mockResolvedValueOnce({ id: 88, slot: 'HAND', itemId: 21 });
    mockPrisma.item.findFirst.mockResolvedValueOnce({ id: 99 });
    swapEquipmentAndContainerMock.mockResolvedValue({
      updatedEquipped: { id: 88, slot: 'HAND', itemId: 99 },
      updatedItem: { id: 21, containerId: 40, containerIndex: 1 },
    });

    const result = await svc.unequipItemToContainer(5, 21, 40, 1);

    expect(swapEquipmentAndContainerMock).toHaveBeenCalledWith(expect.anything(), { id: 88, slot: 'HAND', itemId: 21 }, { id: 99 }, 40, 1);
    expect(result).toEqual({
      item: { id: 21, containerId: 40, containerIndex: 1 },
      changed: [
        { type: 'equipment', slot: 'HAND', oldItemId: 21, newItemId: 99 },
        { type: 'container', containerId: 40, index: 1, oldItemId: 99, newItemId: 21 },
      ],
    });
  });

  it('unequipItemToContainer throws when the item does not exist', async () => {
    const svc = await import('../equipment.service');
    mockPrisma.item.findUnique.mockResolvedValueOnce(null);

    await expect(svc.unequipItemToContainer(3, 123, 1, 0)).rejects.toMatchObject({ code: 'INVALID_ITEM' });
    expect(mockPrisma.equipment.findFirst).not.toHaveBeenCalled();
  });
});
