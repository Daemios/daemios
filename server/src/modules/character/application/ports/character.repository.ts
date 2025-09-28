import { Character, Container, Equipment, Item, Prisma } from '@prisma/client';

export type EquipmentWithItem = Prisma.EquipmentGetPayload<{ include: { Item: true } }>;
export type ContainerWithItems = Prisma.ContainerGetPayload<{
  include: { items: { orderBy: { containerIndex: 'asc' } } };
}>;

export interface CharacterRepository {
  findActiveCharacterForUser(userId: number): Promise<(Character & { race?: any }) | null>;
  deactivateCharacters(userId: number): Promise<Prisma.BatchPayload>;
  activateCharacter(userId: number, characterId: number): Promise<Prisma.BatchPayload>;
  createCharacterForUser(userId: number, data: { name?: string; raceId?: number; image?: string }): Promise<Character>;
  createPocketsContainer(characterId: number): Promise<Container>;
  listCharactersForUser(userId: number): Promise<Character[]>;
  listEquipmentForCharacter(characterId: number): Promise<EquipmentWithItem[]>;
  findPocketsContainer(characterId: number): Promise<Container | null>;
  findItemById(itemId: number): Promise<Item | null>;
  findContainersWithItems(characterId: number): Promise<ContainerWithItems[]>;
}
