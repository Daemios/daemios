import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('bcrypt', () => ({
  default: {
    genSalt: async () => 'salt',
    hash: async () => 'hashed-secret',
  },
}));

import { userService, hashPassword, validateRegistration } from '../user.service';
import * as repo from '../user.repository';
import { DomainError } from '../user.domain';

describe('user.service unit', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('validateRegistration returns error when fields missing', () => {
    expect(validateRegistration({ email: '', password: 'a', passwordConfirm: 'a', displayName: '' })).toBe('All fields are required');
  });

  it('validateRegistration detects password mismatch and short pw', () => {
    expect(validateRegistration({ email: 'a@b.com', password: 'a', passwordConfirm: 'b', displayName: 'Bob' })).toBe('Passwords do not match');
    expect(validateRegistration({ email: 'a@b.com', password: '1234', passwordConfirm: '1234', displayName: 'Bob' })).toBe('Password must be at least 5 characters');
    expect(validateRegistration({ email: 'a@b.com', password: 'abcde', passwordConfirm: 'abcde', displayName: 'Bob' })).toBeNull();
  });

  it('hashPassword returns bcrypt hash', async () => {
    const h = await hashPassword('secret');
    expect(h).toBe('hashed-secret');
  });

  it('createUser rejects when email exists', async () => {
    vi.spyOn(repo.userRepository, 'findByEmail').mockResolvedValue({ id: 1, email: 'a@b.com' } as any);
    await expect(userService.createUser('a@b.com', 'secret', 'A')).rejects.toEqual(new DomainError('EMAIL_IN_USE', 'Email already registered'));
  });

  it('createUser rejects when domain validation fails', async () => {
    vi.spyOn(repo.userRepository, 'findByEmail').mockResolvedValue(null as any);
    try {
      await userService.createUser('not-an-email', 'secret', 'AB');
      throw new Error('expected createUser to throw');
    } catch (err: any) {
      expect(err).toBeInstanceOf(DomainError);
      expect(err.code).toBe('INVALID_EMAIL');
      expect(err.message).toBe('Email is invalid');
    }
  });

  it('createUser calls repository.create with normalized email and hashed password', async () => {
    const findSpy = vi.spyOn(repo.userRepository, 'findByEmail').mockResolvedValue(null as any);
    const createSpy = vi.spyOn(repo.userRepository, 'create').mockResolvedValue({ id: 9, email: 'a@b.com', displayName: 'D' } as any);

  const user = await userService.createUser('  A@B.com ', 'secret', '  Dave  ');
  // service checks uniqueness with the raw input email
  expect(findSpy).toHaveBeenCalledWith('  A@B.com ');
  // repository.create receives normalized email and trimmed displayName
  expect(createSpy).toHaveBeenCalledWith({ email: 'a@b.com', password: 'hashed-secret', displayName: 'Dave' });
    expect(user.id).toBe(9);
  });

  it('getUser wrapper works for id and email', async () => {
    vi.spyOn(repo.userRepository, 'findById').mockResolvedValue({ id: 5, email: 'x@y.com' } as any);
    vi.spyOn(repo.userRepository, 'findByEmail').mockResolvedValue({ id: 6, email: 'z@y.com' } as any);

    const byId = await userService.getUser(5);
    expect(byId).not.toBeNull();
    const byEmail = await userService.getUser('z@y.com');
    expect(byEmail).not.toBeNull();
  });
});
