import { describe, it, expect } from 'vitest';
import {
  DomainError,
  normalizeAbilityElementCreatePayload,
  normalizeAbilityElementUpdatePayload,
} from '../ability.domain';

describe('ability.domain', () => {
  it('DomainError is instantiable', () => {
    const e = new DomainError('X', 'msg');
    expect(e).toBeInstanceOf(Error);
    expect(e.name).toBe('DomainError');
  });

  it('normalizeAbilityElementCreatePayload rejects empty name', () => {
    expect(() => normalizeAbilityElementCreatePayload({ name: '' })).toThrow(DomainError);
  });

  it('normalizeAbilityElementCreatePayload coerces values', () => {
    const normalized = normalizeAbilityElementCreatePayload({
      name: '  Fire  ',
      damage: '12',
      healing: null,
      color: '  #fff  ',
    });
    expect(normalized).toMatchObject({ name: 'Fire', damage: 12, healing: null, color: '#fff' });
  });

  it('normalizeAbilityElementUpdatePayload accepts partial updates', () => {
    const normalized = normalizeAbilityElementUpdatePayload({
      damage: '4',
      name: '  Frost  ',
    });
    expect(normalized).toEqual({ damage: 4, name: 'Frost' });
  });

  it('normalizeAbilityElementUpdatePayload rejects empty patch', () => {
    expect(() => normalizeAbilityElementUpdatePayload({})).toThrow(DomainError);
  });
});
