import { Rules, Rule } from '../../utils/validators';

const coerceNumber = (value: unknown) => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return value;
    return Number(trimmed);
  }
  if (typeof value === 'number') return value;
  return Number(value);
};

const numericRule = (key: string): Rule => ({
  in: 'body',
  key,
  optional: true,
  coerce: coerceNumber,
  validate: (v) => typeof v === 'number' && Number.isFinite(v),
  message: `body.${key} must be a finite number`,
});

const trimmedStringRule = (
  key: string,
  { required = false, allowEmpty = false }: { required?: boolean; allowEmpty?: boolean } = {},
): Rule => ({
  in: 'body',
  key,
  optional: !required,
  coerce: (v) => {
    if (v == null) return v as any;
    if (typeof v === 'string') return v.trim();
    return String(v).trim();
  },
  validate: (v) => typeof v === 'string' && (allowEmpty || v.length > 0),
  message: allowEmpty ? `body.${key} must be a string` : `body.${key} must be a non-empty string`,
});

export const abilityIdRules: Rules = [
  {
    in: 'params',
    key: 'id',
    coerce: (v) => Number(v),
    validate: (v) => typeof v === 'number' && Number.isInteger(v) && v > 0,
    message: 'params.id must be a positive integer',
  },
];

export const createAbilityRules: Rules = [
  trimmedStringRule('name'),
  trimmedStringRule('icon', { allowEmpty: true }),
  trimmedStringRule('effect', { allowEmpty: true }),
  trimmedStringRule('tag', { allowEmpty: true }),
  trimmedStringRule('color', { allowEmpty: true }),
  numericRule('damage'),
  numericRule('healing'),
  numericRule('debuff'),
  numericRule('buff'),
];

export const updateAbilityRules: Rules = [
  ...createAbilityRules,
];
