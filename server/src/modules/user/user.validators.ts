import { Rules } from '../../utils/validators';
import { isEmail, isNonEmptyString } from '../../utils/validators';

export const createUserRules: Rules = [
  { in: 'body', key: 'email', validate: isEmail, message: 'email must be a valid email' },
  { in: 'body', key: 'password', validate: isNonEmptyString, message: 'password must be a non-empty string' },
  { in: 'body', key: 'displayName', validate: isNonEmptyString, message: 'displayName must be a non-empty string' },
];

export const getUserRules: Rules = [
  { in: 'params', key: 'id', validate: (v) => typeof v === 'string' && /^[0-9]+$/.test(v), message: 'id must be numeric' },
];
