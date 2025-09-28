import { mapItemForClient, makePocketsPlaceholder } from '../character.domain';
import { CharacterRepository } from './ports/character.repository';

export class CharacterApplicationService {
  constructor(private readonly repository: CharacterRepository) {}

  getActiveCharacterForUser(userId: number) {
    return this.repository.findActiveCharacterForUser(userId);
  }

  deactivateCharacters(userId: number) {
    return this.repository.deactivateCharacters(userId);
  }

  activateCharacter(userId: number, characterId: number) {
    return this.repository.activateCharacter(userId, characterId);
  }

  async createCharacterForUser(userId: number, payload: { name?: string; raceId?: number; image?: string }) {
    const created = await this.repository.createCharacterForUser(userId, payload);
    try {
      if (created && created.id) {
        await this.repository.createPocketsContainer(created.id);
      }
    } catch (err) {
      console.warn('Failed to create pockets container for new character', (err as any)?.code);
    }
    return created;
  }

  listCharactersForUser(userId: number) {
    return this.repository.listCharactersForUser(userId);
  }

  async buildCharacterWithEquipment(character: any) {
    const equipmentRows = await this.repository.listEquipmentForCharacter(character.id);
    const equipped: Record<string, any> = {};
    equipmentRows.forEach((row) => {
      const key = String(row.slot).toLowerCase();
      equipped[key] = mapItemForClient(row.Item) || null;
    });

    const pockets = await this.repository.findPocketsContainer(character.id);
    if (pockets) {
      const pocketItem = pockets.itemId ? mapItemForClient(await this.repository.findItemById(pockets.itemId)) : makePocketsPlaceholder(pockets);
      equipped.pocket = pocketItem;
    } else {
      equipped.pocket = null;
    }

    return { ...character, equipped };
  }

  async getContainersForCharacter(characterId: number) {
    const containers = await this.repository.findContainersWithItems(characterId);
    return containers.map((c) => ({
      ...c,
      containerType: c.containerType || 'BASIC',
      items: (c.items || []).map(mapItemForClient),
    }));
  }
}

export type CharacterApplicationServiceFactory = (deps: { repository: CharacterRepository }) => CharacterApplicationService;

export const createCharacterApplicationService: CharacterApplicationServiceFactory = ({ repository }) =>
  new CharacterApplicationService(repository);
