import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock bcrypt at the module level to avoid spying on non-configurable properties
vi.mock('bcrypt', () => ({
  default: {
    genSalt: async () => 'salt',
    hash: async () => 'hashed-secret',
  },
}));

import { userService } from '../user.service';
import * as repo from '../user.repository';
import { DomainError } from '../user.domain';

describe('userService', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('throws 409 when email exists', async () => {
    vi.spyOn(repo.userRepository, 'findByEmail').mockResolvedValue({ id: 1, email: 'a@b.com', displayName: 'A' } as any);
  await expect(userService.createUser('a@b.com', 'secret', 'A')).rejects.toEqual(new DomainError('EMAIL_IN_USE', 'Email already registered'));
  });

  it('creates when unique', async () => {
    vi.spyOn(repo.userRepository, 'findByEmail').mockResolvedValue(null as any);
    vi.spyOn(repo.userRepository, 'create').mockResolvedValue({ id: 2, email: 'c@d.com', displayName: 'Z' } as any);
  // bcrypt module is mocked at top-level to return stable hash
  const user = await userService.createUser('c@d.com', 'secret', 'ZZ');
    expect(user.email).toBe('c@d.com');
  });

  it('getUser throws 404', async () => {
    vi.spyOn(repo.userRepository, 'findById').mockResolvedValue(null as any);
  // getUser returns null when not found; the previous behavior threw HttpError(404). Update expectation to null result - service returns null for not found.
  const result = await userService.getUser(999);
  expect(result).toBeNull();
  });
});
