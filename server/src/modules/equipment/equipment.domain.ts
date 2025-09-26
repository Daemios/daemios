export class DomainError extends Error {
  constructor(public code: string, message?: string) {
    super(message ?? code);
    this.name = 'DomainError';
  }
}

export function ensureItemBelongsToCharacter(item: any, characterId: number) {
  if (!item) throw new DomainError('ITEM_NOT_FOUND', 'Item not found');
  if (item.characterId !== characterId) throw new DomainError('ITEM_NOT_OWNED', 'Item does not belong to character');
}
