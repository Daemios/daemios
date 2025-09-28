import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma used by character.service
vi.mock('../../../db/prisma', () => ({
  prisma: {
    character: {
      findFirst: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    equipment: { findMany: vi.fn() },
    container: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn() },
    item: { findUnique: vi.fn() },
  },
}));

import { characterService, buildCharacterWithEquipment, getContainersForCharacter } from '../character.service';
import { prisma } from '../../../db/prisma';

describe('character.service', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('getActiveCharacterForUser returns character from prisma', async () => {
    (prisma.character.findFirst as any) = vi.fn().mockResolvedValue({ id: 3, userId: 1 });
    const c = await characterService.getActiveCharacterForUser(1);
    expect(c).toHaveProperty('id', 3);
  });

  it('createCharacterForUser creates pockets container after create', async () => {
    (prisma.character.create as any) = vi.fn().mockResolvedValue({ id: 7, name: 'C' });
    (prisma.container.create as any) = vi.fn().mockResolvedValue({ id: 11, name: 'Pockets' });
    const created = await characterService.createCharacterForUser(10, { name: 'C' });
    expect(created).toHaveProperty('id', 7);
    expect(prisma.container.create).toHaveBeenCalled();
  });

  it('listCharactersForUser uses prisma.findMany', async () => {
    (prisma.character.findMany as any) = vi.fn().mockResolvedValue([{ id: 2 }, { id: 3 }]);
    const rows = await characterService.listCharactersForUser(5);
    expect(rows).toHaveLength(2);
  });

  it('buildCharacterWithEquipment maps equipped items and pockets placeholder when empty', async () => {
    const char = { id: 20, name: 'Hero' } as any;
    (prisma.equipment.findMany as any) = vi.fn().mockResolvedValue([{ slot: 'HEAD', Item: { id: 101, name: 'Hat' } }]);
    (prisma.container.findFirst as any) = vi.fn().mockResolvedValue({ id: 33, name: 'Pockets', itemId: null, capacity: 4 });
    (prisma.item.findUnique as any) = vi.fn().mockResolvedValue(null);
    const result = await buildCharacterWithEquipment(char);
    expect(result.equipped).toHaveProperty('head');
    expect(result.equipped).toHaveProperty('pocket');
    expect(result.equipped.pocket.label).toBe('Pockets');
  });

  it('buildCharacterWithEquipment maps actual pockets item when present', async () => {
    const char = { id: 25, name: 'Rogue' } as any;
    const pocketItem = { id: 401, name: 'Handkerchief', image: '/img/hankie.png' };
    (prisma.equipment.findMany as any) = vi.fn().mockResolvedValue([]);
    (prisma.container.findFirst as any) = vi.fn().mockResolvedValue({ id: 55, name: 'Pockets', itemId: pocketItem.id, capacity: 2 });
    (prisma.item.findUnique as any) = vi.fn().mockResolvedValue(pocketItem);
    const result = await buildCharacterWithEquipment(char);
    expect(result.equipped.pocket).toEqual(expect.objectContaining({ id: pocketItem.id, label: pocketItem.name, img: pocketItem.image }));
  });

  it('buildCharacterWithEquipment sets pocket to null when container missing', async () => {
    const char = { id: 30, name: 'Mage' } as any;
    (prisma.equipment.findMany as any) = vi.fn().mockResolvedValue([]);
    (prisma.container.findFirst as any) = vi.fn().mockResolvedValue(null);
    const result = await buildCharacterWithEquipment(char);
    expect(result.equipped.pocket).toBeNull();
  });

  it('getContainersForCharacter returns containers with mapped items', async () => {
    (prisma.container.findMany as any) = vi.fn().mockResolvedValue([{ id: 1, containerType: 'POCKETS', items: [{ id: 5, name: 'Coin' }] }]);
    const css = await getContainersForCharacter(1);
    expect(css[0]).toHaveProperty('items');
    expect(css[0].items[0]).toHaveProperty('label');
  });

  it('getContainersForCharacter applies fallback icon and containerType defaults', async () => {
    (prisma.container.findMany as any) = vi.fn().mockResolvedValue([{ id: 2, containerType: null, items: [] }]);
    const css = await getContainersForCharacter(9);
    expect(css[0].containerType).toBe('BASIC');
    expect(css[0].icon).toBeNull();
  });
});
