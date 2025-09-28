import { PrismaClient, Prisma } from '@prisma/client';
import { CharacterRepository, ContainerWithItems, EquipmentWithItem } from '../../application/ports/character.repository';

type PrismaClientLike = PrismaClient | Prisma.TransactionClient;

export class PrismaCharacterRepository implements CharacterRepository {
  constructor(private readonly client: PrismaClientLike) {}

  findActiveCharacterForUser(userId: number) {
    return this.client.character.findFirst({
      where: { user: { id: userId }, active: true },
      include: { race: true },
    });
  }

  deactivateCharacters(userId: number) {
    return this.client.character.updateMany({ where: { user: { id: userId } }, data: { active: false } });
  }

  activateCharacter(userId: number, characterId: number) {
    return this.client.character.updateMany({ where: { user: { id: userId }, id: characterId }, data: { active: true } });
  }

  createCharacterForUser(userId: number, data: { name?: string | undefined; raceId?: number | undefined; image?: string | undefined }) {
    const payload: any = { user: { connect: { id: userId } } };
    if (data.name != null) payload.name = data.name;
    if (data.image != null) payload.image = data.image;
    if (data.raceId != null) payload.race = { connect: { id: data.raceId } };
    return this.client.character.create({ data: payload });
  }

  createPocketsContainer(characterId: number) {
    return this.client.container.create({
      data: { name: 'Pockets', capacity: 6, characterId, removable: true, containerType: 'POCKETS' },
    });
  }

  listCharactersForUser(userId: number) {
    return this.client.character.findMany({ where: { userId } });
  }

  listEquipmentForCharacter(characterId: number): Promise<EquipmentWithItem[]> {
    return this.client.equipment.findMany({ where: { characterId }, include: { Item: true } }) as Promise<EquipmentWithItem[]>;
  }

  findPocketsContainer(characterId: number) {
    return this.client.container.findFirst({ where: { characterId, name: 'Pockets' } });
  }

  findItemById(itemId: number) {
    return this.client.item.findUnique({ where: { id: itemId } });
  }

  findContainersWithItems(characterId: number): Promise<ContainerWithItems[]> {
    return this.client.container.findMany({
      where: { characterId },
      include: { items: { orderBy: { containerIndex: 'asc' } } },
    }) as Promise<ContainerWithItems[]>;
  }
}
