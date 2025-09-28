import { Container, Equipment, Item, Prisma } from '@prisma/client';

export type ContainerWithItems = Prisma.ContainerGetPayload<{
  include: { items: { orderBy: { containerIndex: 'asc' } } };
}>;

export type EquipmentWithItem = Prisma.EquipmentGetPayload<{ include: { Item: true } }>;

export interface InventoryRepository {
  fetchContainersWithItems(characterId: number): Promise<ContainerWithItems[]>;
  findContainerById(id: number): Promise<Container | null>;
  findItemById(id: number): Promise<Item | null>;
  findItemAtPosition(params: { containerId: number | null; localIndex: number | null }): Promise<Item | null>;
  updateItemPosition(itemId: number, data: { containerId: number | null; containerIndex: number | null }): Promise<void>;
  runInTransaction<T>(fn: (repo: InventoryRepository) => Promise<T>): Promise<T>;
  listEquipmentForCharacter(characterId: number): Promise<EquipmentWithItem[]>;
  findEquipmentRowByItemId(itemId: number): Promise<Equipment | null>;
}
