import { describe, it, expect } from 'vitest';
import { DomainError, normalizeAbilityElementPayload } from '../ability.domain';

describe('ability.domain', () => {
  it('DomainError is instantiable', () => {
    const e = new DomainError('X', 'msg');
    expect(e).toBeInstanceOf(Error);
    expect(e.name).toBe('DomainError');
  });

  it('normalizeAbilityElementPayload rejects empty name', () => {
    expect(() => normalizeAbilityElementPayload({ name: '' })).toThrow(DomainError);
  });
});
