import { describe, it, expect, vi } from 'vitest';
import { PrismaInventoryRepository } from '../infrastructure/prisma/inventory.repository';

const createPrismaMock = () => {
  const mockClient: any = {
    container: { findMany: vi.fn(), findUnique: vi.fn() },
    item: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    equipment: { findMany: vi.fn(), findFirst: vi.fn() },
    $transaction: vi.fn(),
  };
  mockClient.$transaction.mockImplementation(async (cb: any) => cb(mockClient));
  return mockClient;
};

describe('PrismaInventoryRepository', () => {
  it('falls back to container fetch without include when P2022 occurs', async () => {
    const prisma = createPrismaMock();
    prisma.container.findMany.mockImplementationOnce(() => {
      const error: any = new Error('P2022');
      error.code = 'P2022';
      throw error;
    });
    prisma.container.findMany.mockResolvedValueOnce([{ id: 1 }]);
    const repo = new PrismaInventoryRepository(prisma as any);
    const result = await repo.fetchContainersWithItems(1);
    expect(result).toEqual([{ id: 1 }]);
    expect(prisma.container.findMany).toHaveBeenCalledTimes(2);
  });

  it('executes transactional operations when runInTransaction is called', async () => {
    const prisma = createPrismaMock();
    const repo = new PrismaInventoryRepository(prisma as any);
    await repo.runInTransaction(async (txRepo) => {
      await txRepo.updateItemPosition(1, { containerId: null, containerIndex: null });
    });
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.item.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { containerId: null, containerIndex: null },
    });
  });
});
