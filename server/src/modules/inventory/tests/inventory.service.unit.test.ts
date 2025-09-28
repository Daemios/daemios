import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InventoryApplicationService, EquipmentGateway } from '../application/inventory.service';
import { InventoryRepository } from '../application/ports/inventory.repository';

const createRepositoryMock = () => {
  const repo: Record<string, any> = {
    fetchContainersWithItems: vi.fn().mockResolvedValue([]),
    findContainerById: vi.fn(),
    findItemById: vi.fn(),
    findItemAtPosition: vi.fn(),
    updateItemPosition: vi.fn().mockResolvedValue(undefined),
    runInTransaction: vi.fn(),
    listEquipmentForCharacter: vi.fn().mockResolvedValue([]),
    findEquipmentRowByItemId: vi.fn(),
  };
  repo.runInTransaction.mockImplementation(async (fn: any) => fn(repo));
  return repo as InventoryRepository & Record<string, any>;
};

const createEquipmentGatewayMock = (): EquipmentGateway => ({
  performEquipForCharacter: vi.fn(),
  unequipItemToContainer: vi.fn(),
});

describe('InventoryApplicationService', () => {
  let repository: InventoryRepository & Record<string, any>;
  let equipmentGateway: EquipmentGateway & Record<string, any>;
  let service: InventoryApplicationService;

  beforeEach(() => {
    repository = createRepositoryMock();
    equipmentGateway = createEquipmentGatewayMock() as any;
    service = new InventoryApplicationService(repository, equipmentGateway);
    vi.clearAllMocks();
  });

  it('maps items for client using presentation helper', () => {
    expect(service.mapItemForClient(null)).toBeNull();
    const mapped = service.mapItemForClient({
      id: 1,
      image: null,
      label: null,
      name: null,
      displayName: 'Fancy Flask',
      itemType: 42,
    });
    expect(mapped?.label).toBe('Fancy Flask');
    expect(mapped?.img).toBe('/img/debug/placeholder.png');
  });

  it('throws 404 when moving item that does not exist', async () => {
    repository.findItemById.mockResolvedValue(null);
    await expect(service.moveItemForCharacter({ id: 1 }, { itemId: 5 } as any)).rejects.toHaveProperty('status', 404);
  });

  it('throws 403 when moving item for other character', async () => {
    repository.findItemById.mockResolvedValue({ id: 5, characterId: 2 });
    await expect(service.moveItemForCharacter({ id: 1 }, { itemId: 5 } as any)).rejects.toHaveProperty('status', 403);
  });

  it('validates target container capacity and type', async () => {
    repository.findItemById.mockResolvedValue({
      id: 6,
      characterId: 1,
      containerId: null,
      containerIndex: null,
      isContainer: false,
      itemType: 'FOOD',
    });
    repository.findContainerById.mockResolvedValue({ id: 2, capacity: 1, containerType: 'BASIC' });
    repository.findItemAtPosition.mockResolvedValue(null);
    await expect(
      service.moveItemForCharacter({ id: 1 }, { itemId: 6, target: { containerId: 2, localIndex: 2 } } as any),
    ).rejects.toHaveProperty('status', 400);
  });

  it('swaps items within same container inside transaction', async () => {
    repository.findItemById.mockResolvedValue({
      id: 7,
      characterId: 1,
      containerId: 3,
      containerIndex: 0,
      isContainer: false,
    });
    repository.findContainerById.mockResolvedValue({ id: 3, capacity: 5, containerType: 'BASIC' });
    repository.findItemAtPosition.mockResolvedValue({ id: 8, containerId: 3, containerIndex: 1 });
    repository.fetchContainersWithItems.mockResolvedValue([]);
    await service.moveItemForCharacter({ id: 1 }, { itemId: 7, target: { containerId: 3, localIndex: 1 } } as any);
    expect(repository.runInTransaction).toHaveBeenCalled();
  });

  it('calls equipment gateway for equipment destination', async () => {
    repository.findItemById.mockResolvedValue({ id: 10, characterId: 1 });
    (equipmentGateway.performEquipForCharacter as any).mockResolvedValue({ ok: true });
    const res = await service.placeItem(
      { id: 1 },
      { itemId: 10, destination: { type: 'equipment', slotId: 'hand' } },
    );
    expect(equipmentGateway.performEquipForCharacter).toHaveBeenCalledWith(1, 10, 'hand');
    expect(res).toEqual({ ok: true });
  });

  it('unequips item to container when equipment row exists', async () => {
    repository.findItemById.mockResolvedValue({ id: 11, characterId: 1 });
    repository.findEquipmentRowByItemId.mockResolvedValue({ characterId: 1 });
    repository.fetchContainersWithItems.mockResolvedValue([{ id: 1, items: [] } as any]);
    repository.listEquipmentForCharacter.mockResolvedValue([{ id: 99, itemId: 11 } as any]);
    (equipmentGateway.unequipItemToContainer as any).mockResolvedValue({ ok: true });

    const res = await service.placeItem(
      { id: 1 },
      { itemId: 11, destination: { type: 'container', containerId: 5, index: 0 } },
    );

    expect(equipmentGateway.unequipItemToContainer).toHaveBeenCalledWith(1, 11, 5, 0);
    expect(res.equipment).toEqual([{ id: 99, itemId: 11 }]);
    expect(res.containers[0]).toEqual(expect.objectContaining({ id: 1 }));
  });
});
