export class DomainError extends Error {
  constructor(public code: string, message?: string) {
    super(message ?? code);
    this.name = 'DomainError';
  }
}

export type NewUserInput = { email: string; displayName: string; passwordHash: string };

export function newUser(i: Partial<NewUserInput>): NewUserInput {
  const email = (i.email ?? '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new DomainError('INVALID_EMAIL', 'Email is invalid');

  const displayName = (i.displayName ?? '').trim();
  if (displayName.length < 2) throw new DomainError('NAME_TOO_SHORT', 'displayName must be at least 2 characters');

  if (typeof i.passwordHash !== 'string' || !i.passwordHash) throw new DomainError('PASSWORD_REQUIRED', 'passwordHash required');

  return { email, displayName, passwordHash: i.passwordHash };
}
