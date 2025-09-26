export class DomainError extends Error {
  public code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
  }
}

// Currently `data.service.ts` provides simple passthroughs to Prisma. This
// domain file is small but provides a place for future validation or
// transformation logic (for example, pagination or filters).

export interface ListRacesOptions {
  includeDeprecated?: boolean;
}

export function normalizeListRacesOptions(o?: any): ListRacesOptions {
  if (!o) return {};
  if (typeof o !== 'object') throw new DomainError('INVALID_OPTIONS', 'options must be an object');
  return { includeDeprecated: Boolean(o.includeDeprecated) };
}
