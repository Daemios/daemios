import { describe, it, expect } from 'vitest';
import { DomainError, validateCreateArenaHistory } from '../arena.domain';

describe('arena.domain', () => {
  it('DomainError is instantiable', () => {
    const e = new DomainError('CODE', 'msg');
    expect(e).toBeInstanceOf(Error);
    expect(e.name).toBe('DomainError');
  });

  it('validateCreateArenaHistory rejects invalid payload', () => {
    expect(() => validateCreateArenaHistory(null as any)).toThrow(DomainError);
  });
});
