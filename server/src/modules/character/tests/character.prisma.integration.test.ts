import { describe, it, expect, vi } from 'vitest';
import { PrismaCharacterRepository } from '../infrastructure/prisma/character.repository';

const createPrismaMock = () => {
  const mockClient: any = {
    character: { findFirst: vi.fn(), updateMany: vi.fn(), create: vi.fn(), findMany: vi.fn() },
    container: { create: vi.fn(), findFirst: vi.fn(), findMany: vi.fn() },
    equipment: { findMany: vi.fn() },
    item: { findUnique: vi.fn() },
  };
  return mockClient;
};

describe('PrismaCharacterRepository', () => {
  it('creates character with nested relations and pockets container', async () => {
    const prisma = createPrismaMock();
    prisma.character.create.mockResolvedValue({ id: 10 });
    const repo = new PrismaCharacterRepository(prisma as any);
    const created = await repo.createCharacterForUser(1, { name: 'Hero', raceId: 2, image: 'img.png' });
    expect(prisma.character.create).toHaveBeenCalled();
    expect(created).toEqual({ id: 10 });
  });

  it('lists containers with items ordering by index', async () => {
    const prisma = createPrismaMock();
    prisma.container.findMany.mockResolvedValue([]);
    const repo = new PrismaCharacterRepository(prisma as any);
    await repo.findContainersWithItems(5);
    expect(prisma.container.findMany).toHaveBeenCalledWith({
      where: { characterId: 5 },
      include: { items: { orderBy: { containerIndex: 'asc' } } },
    });
  });
});
