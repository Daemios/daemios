import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CharacterApplicationService } from '../application/character.service';
import { CharacterRepository } from '../application/ports/character.repository';

const createRepositoryMock = () => {
  const repo: Record<string, any> = {
    findActiveCharacterForUser: vi.fn(),
    deactivateCharacters: vi.fn(),
    activateCharacter: vi.fn(),
    createCharacterForUser: vi.fn(),
    createPocketsContainer: vi.fn(),
    listCharactersForUser: vi.fn(),
    listEquipmentForCharacter: vi.fn(),
    findPocketsContainer: vi.fn(),
    findItemById: vi.fn(),
    findContainersWithItems: vi.fn(),
  };
  return repo as CharacterRepository & Record<string, any>;
};

describe('CharacterApplicationService', () => {
  let repository: CharacterRepository & Record<string, any>;
  let service: CharacterApplicationService;

  beforeEach(() => {
    repository = createRepositoryMock();
    service = new CharacterApplicationService(repository);
    vi.clearAllMocks();
  });

  it('returns active character using repository', async () => {
    repository.findActiveCharacterForUser.mockResolvedValue({ id: 3 });
    const result = await service.getActiveCharacterForUser(1);
    expect(result).toEqual({ id: 3 });
  });

  it('creates pockets container after character creation', async () => {
    repository.createCharacterForUser.mockResolvedValue({ id: 5 });
    await service.createCharacterForUser(1, { name: 'C' });
    expect(repository.createPocketsContainer).toHaveBeenCalledWith(5);
  });

  it('lists characters via repository', async () => {
    repository.listCharactersForUser.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    const rows = await service.listCharactersForUser(5);
    expect(rows).toHaveLength(2);
  });

  it('buildCharacterWithEquipment maps pockets placeholder', async () => {
    repository.listEquipmentForCharacter.mockResolvedValue([{ slot: 'HEAD', Item: { id: 1, name: 'Hat' } }]);
    repository.findPocketsContainer.mockResolvedValue({ id: 2, itemId: null, capacity: 4 });
    const result = await service.buildCharacterWithEquipment({ id: 1 });
    expect(result.equipped.head).toBeTruthy();
    expect(result.equipped.pocket.label).toBe('Pockets');
  });

  it('getContainersForCharacter maps container items', async () => {
    repository.findContainersWithItems.mockResolvedValue([
      { id: 1, containerType: null, items: [{ id: 9, name: 'Coin' }] },
    ]);
    const containers = await service.getContainersForCharacter(1);
    expect(containers[0].containerType).toBe('BASIC');
    expect(containers[0].items[0]).toHaveProperty('label');
  });
});
