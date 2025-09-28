import { Prisma, PrismaClient } from '@prisma/client';
import { InventoryRepository, ContainerWithItems, EquipmentWithItem } from '../../application/ports/inventory.repository';

type PrismaClientLike = PrismaClient | Prisma.TransactionClient;

export class PrismaInventoryRepository implements InventoryRepository {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly client: PrismaClientLike = prisma,
    private readonly transactional: boolean = false,
  ) {}

  async fetchContainersWithItems(characterId: number): Promise<ContainerWithItems[]> {
    try {
      return (await this.client.container.findMany({
        where: { characterId },
        include: { items: { orderBy: { containerIndex: 'asc' } } },
      })) as ContainerWithItems[];
    } catch (err: any) {
      if (err && err.code === 'P2022') {
        return (await this.client.container.findMany({
          where: { characterId },
        })) as unknown as ContainerWithItems[];
      }
      throw err;
    }
  }

  findContainerById(id: number) {
    return this.client.container.findUnique({ where: { id } });
  }

  findItemById(id: number) {
    return this.client.item.findUnique({ where: { id } });
  }

  findItemAtPosition(params: { containerId: number | null; localIndex: number | null }) {
    const { containerId, localIndex } = params;
    return this.client.item.findFirst({ where: { containerId, containerIndex: localIndex } });
  }

  async updateItemPosition(itemId: number, data: { containerId: number | null; containerIndex: number | null }) {
    await this.client.item.update({ where: { id: itemId }, data });
  }

  async runInTransaction<T>(fn: (repo: InventoryRepository) => Promise<T>): Promise<T> {
    if (this.transactional) {
      return fn(this);
    }
    return this.prisma.$transaction(async (tx) => {
      const txRepo = new PrismaInventoryRepository(this.prisma, tx, true);
      return fn(txRepo);
    });
  }

  listEquipmentForCharacter(characterId: number): Promise<EquipmentWithItem[]> {
    return this.client.equipment.findMany({ where: { characterId }, include: { Item: true } }) as Promise<EquipmentWithItem[]>;
  }

  findEquipmentRowByItemId(itemId: number) {
    return this.client.equipment.findFirst({ where: { itemId } });
  }
}
