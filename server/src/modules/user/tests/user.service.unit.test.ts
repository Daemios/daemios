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
    await expect(userService.createUser('not-an-email', 'secret', 'AB')).rejects.toEqual(new DomainError('INVALID_EMAIL', 'Email is invalid'));
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

  it('createUser accepts a payload object and normalizes before persisting', async () => {
    const findSpy = vi.spyOn(repo.userRepository, 'findByEmail').mockResolvedValue(null as any);
    const createSpy = vi.spyOn(repo.userRepository, 'create').mockResolvedValue({
      id: 42,
      email: 'john@example.com',
      displayName: 'John',
    } as any);

    const user = await userService.createUser({
      email: '  John@Example.com  ',
      password: 'secret',
      displayName: '  John  ',
    });

    expect(findSpy).toHaveBeenCalledWith('  John@Example.com  ');
    expect(createSpy).toHaveBeenCalledWith({
      email: 'john@example.com',
      password: 'hashed-secret',
      displayName: 'John',
    });
    expect(user).toEqual({ id: 42, email: 'john@example.com', displayName: 'John' });
  });

  it('getUser wrapper works for id and email', async () => {
    vi.spyOn(repo.userRepository, 'findById').mockResolvedValue({ id: 5, email: 'x@y.com' } as any);
    vi.spyOn(repo.userRepository, 'findByEmail').mockResolvedValue({ id: 6, email: 'z@y.com' } as any);

    const byId = await userService.getUser(5);
    expect(byId).not.toBeNull();
    const byEmail = await userService.getUser('z@y.com');
    expect(byEmail).not.toBeNull();
  });

  it('getUser prefers id when payload contains both id and email', async () => {
    const findById = vi.spyOn(repo.userRepository, 'findById').mockResolvedValue({
      id: 7,
      email: 'combo@example.com',
    } as any);
    const findByEmail = vi.spyOn(repo.userRepository, 'findByEmail').mockResolvedValue({
      id: 99,
      email: 'combo@example.com',
    } as any);

    const user = await userService.getUser({ id: 7, email: 'combo@example.com' });

    expect(findById).toHaveBeenCalledWith(7);
    expect(findByEmail).not.toHaveBeenCalled();
    expect(user).toEqual({ id: 7, email: 'combo@example.com' });
  });

  it('getUser returns null without hitting the repository for invalid payloads', async () => {
    const findById = vi.spyOn(repo.userRepository, 'findById');
    const findByEmail = vi.spyOn(repo.userRepository, 'findByEmail');

    const result = await userService.getUser({ foo: 'bar' });
    expect(result).toBeNull();
    expect(findById).not.toHaveBeenCalled();
    expect(findByEmail).not.toHaveBeenCalled();

    const resultUndefined = await userService.getUser(undefined as any);
    expect(resultUndefined).toBeNull();
    expect(findById).not.toHaveBeenCalled();
    expect(findByEmail).not.toHaveBeenCalled();
  });
});
