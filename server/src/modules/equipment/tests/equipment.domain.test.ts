import { describe, it, expect } from 'vitest';
import { ensureItemBelongsToCharacter, DomainError } from '../equipment.domain';

describe('equipment.domain.ensureItemBelongsToCharacter', () => {
  it('throws ITEM_NOT_FOUND when item is falsy', () => {
    expect(() => ensureItemBelongsToCharacter(null as any, 1)).toThrowError(DomainError);
    try { ensureItemBelongsToCharacter(null as any, 1); } catch (e: any) {
      expect(e.code).toBe('ITEM_NOT_FOUND');
    }
  });

  it('throws ITEM_NOT_OWNED when characterId does not match', () => {
    const item = { id: 5, characterId: 10 };
    expect(() => ensureItemBelongsToCharacter(item, 11)).toThrowError(DomainError);
    try { ensureItemBelongsToCharacter(item, 11); } catch (e: any) {
      expect(e.code).toBe('ITEM_NOT_OWNED');
    }
  });

  it('does not throw when item belongs to character', () => {
    const item = { id: 8, characterId: 3 };
    expect(() => ensureItemBelongsToCharacter(item, 3)).not.toThrow();
  });
});
