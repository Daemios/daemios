export class DomainError extends Error {
  constructor(public code: string, message?: string) {
    super(message ?? code);
    this.name = 'DomainError';
  }
}

export type AbilityElementRecord = {
  name: string | null;
  icon: string | null;
  effect: string | null;
  tag: string | null;
  damage: number | null;
  healing: number | null;
  debuff: number | null;
  buff: number | null;
  color: string | null;
};

export type AbilityElementCreateInput = AbilityElementRecord;
export type AbilityElementUpdateInput = Partial<AbilityElementRecord>;

export type AbilityElementCreatePayload = Partial<Record<keyof AbilityElementRecord, unknown>> | null | undefined;
export type AbilityElementUpdatePayload = AbilityElementCreatePayload;

const OPTIONAL_STRING_FIELDS = ['icon', 'effect', 'tag', 'color'] as const;
type OptionalStringField = typeof OPTIONAL_STRING_FIELDS[number];
const OPTIONAL_NUMBER_FIELDS = ['damage', 'healing', 'debuff', 'buff'] as const;
type OptionalNumberField = typeof OPTIONAL_NUMBER_FIELDS[number];

function ensureObject(payload: AbilityElementCreatePayload): Record<string, unknown> {
  if (!payload || typeof payload !== 'object') {
    throw new DomainError('INVALID_PAYLOAD', 'Ability element payload must be an object');
  }
  return payload as Record<string, unknown>;
}

function normalizeName(value: unknown) {
  if (value == null) return null;
  const trimmed = String(value).trim();
  if (!trimmed) throw new DomainError('NAME_REQUIRED', 'Ability element name cannot be empty');
  return trimmed;
}

function normalizeOptionalString(value: unknown) {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed === '' ? null : trimmed;
}

function normalizeOptionalNumber(field: string, value: unknown) {
  if (value == null || value === '') return null;
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) {
    throw new DomainError('INVALID_NUMBER', `${field} must be a finite number`);
  }
  return num;
}

export function normalizeAbilityElementCreatePayload(payload: AbilityElementCreatePayload): AbilityElementCreateInput {
  const input = ensureObject(payload);
  return {
    name: normalizeName(input.name),
    icon: normalizeOptionalString(input.icon),
    effect: normalizeOptionalString(input.effect),
    tag: normalizeOptionalString(input.tag),
    damage: normalizeOptionalNumber('damage', input.damage),
    healing: normalizeOptionalNumber('healing', input.healing),
    debuff: normalizeOptionalNumber('debuff', input.debuff),
    buff: normalizeOptionalNumber('buff', input.buff),
    color: normalizeOptionalString(input.color),
  };
}

export function normalizeAbilityElementUpdatePayload(payload: AbilityElementUpdatePayload): AbilityElementUpdateInput {
  const input = ensureObject(payload);
  const normalized: AbilityElementUpdateInput = {};

  if (Object.prototype.hasOwnProperty.call(input, 'name')) {
    normalized.name = normalizeName(input.name);
  }

  for (const field of OPTIONAL_STRING_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(input, field)) {
      // field is narrowed to OptionalStringField, so the assignment is typed as string|null | undefined
      normalized[field as OptionalStringField] = normalizeOptionalString(input[field as OptionalStringField]);
    }
  }

  for (const field of OPTIONAL_NUMBER_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(input, field)) {
      // field is narrowed to OptionalNumberField
      normalized[field as OptionalNumberField] = normalizeOptionalNumber(field as string, input[field as OptionalNumberField]);
    }
  }

  if (Object.keys(normalized).length === 0) {
    throw new DomainError('NO_UPDATES', 'No updatable fields provided');
  }

  return normalized;
}
