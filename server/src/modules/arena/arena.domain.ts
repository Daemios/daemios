export class DomainError extends Error {
  public code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
  }
}

export interface CreateArenaHistoryInput {
  name: string;
  seed: string;
  size: number;
}

export function validateCreateArenaHistory(i: CreateArenaHistoryInput) {
  if (!i || typeof i !== 'object') throw new DomainError('INVALID_PAYLOAD', 'payload must be an object');
  const { name, seed, size } = i as any;
  if (typeof name !== 'string' || !name.trim()) throw new DomainError('NAME_REQUIRED', 'Arena name is required');
  if (typeof seed !== 'string') throw new DomainError('INVALID_SEED', 'seed must be a string');
  if (!Number.isInteger(size) || size <= 0) throw new DomainError('INVALID_SIZE', 'size must be a positive integer');
  return { name: name.trim(), seed, size } as CreateArenaHistoryInput;
}
