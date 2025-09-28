import { describe, it, expect } from 'vitest';
import { newUser, DomainError } from '../user.domain';

describe('user.domain - newUser', () => {
  it('normalizes email and displayName', () => {
    const result = newUser({ email: '  Foo@Example.Com ', displayName: '  Bob  ', passwordHash: 'ph' });
    expect(result.email).toBe('foo@example.com');
    expect(result.displayName).toBe('Bob');
    expect(result.passwordHash).toBe('ph');
  });

  it('throws INVALID_EMAIL for bad email', () => {
    try {
      newUser({ email: 'nope', displayName: 'Bob', passwordHash: 'ph' });
      throw new Error('expected newUser to throw');
    } catch (err: any) {
      expect(err).toBeInstanceOf(DomainError);
      expect(err.code).toBe('INVALID_EMAIL');
      expect(err.message).toBe('Email is invalid');
    }
  });

  it('throws NAME_TOO_SHORT for short displayName', () => {
    try {
      newUser({ email: 'a@b.com', displayName: 'A', passwordHash: 'ph' });
      throw new Error('expected newUser to throw');
    } catch (err: any) {
      expect(err).toBeInstanceOf(DomainError);
      expect(err.code).toBe('NAME_TOO_SHORT');
      expect(err.message).toBe('displayName must be at least 2 characters');
    }
  });

  it('throws PASSWORD_REQUIRED when passwordHash missing', () => {
    // @ts-ignore - intentionally missing
    try {
      newUser({ email: 'a@b.com', displayName: 'Bob' });
      throw new Error('expected newUser to throw');
    } catch (err: any) {
      expect(err).toBeInstanceOf(DomainError);
      expect(err.code).toBe('PASSWORD_REQUIRED');
      expect(err.message).toBe('passwordHash required');
    }
  });
});
